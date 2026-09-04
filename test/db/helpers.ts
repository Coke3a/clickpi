import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

/**
 * Parses the `KEY="value"` / `KEY=value` lines `supabase status -o env` prints
 * on stdout into a plain map. Any other stdout lines are ignored.
 */
function parseSupabaseStatusEnv(output: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    map[match[1]] = value
  }
  return map
}

function resolveSupabaseTestConfig(): { url: string; anonKey: string; serviceRoleKey: string } {
  const envUrl = process.env.SUPABASE_TEST_URL
  const envAnonKey = process.env.SUPABASE_TEST_ANON_KEY
  const envServiceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

  if (envUrl && envAnonKey && envServiceRoleKey) {
    return { url: envUrl, anonKey: envAnonKey, serviceRoleKey: envServiceRoleKey }
  }

  const helpMessage =
    'Could not resolve local Supabase test credentials. Run `npx supabase start` first, ' +
    'or set SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_ROLE_KEY explicitly.'

  let statusMap: Record<string, string>
  try {
    const output = execSync('npx supabase status -o env', { encoding: 'utf8' })
    statusMap = parseSupabaseStatusEnv(output)
  } catch (err) {
    throw new Error(`${helpMessage} (\`npx supabase status\` failed: ${(err as Error).message})`)
  }

  const url = envUrl ?? statusMap.API_URL
  const anonKey = envAnonKey ?? statusMap.ANON_KEY
  const serviceRoleKey = envServiceRoleKey ?? statusMap.SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(`${helpMessage} (\`npx supabase status -o env\` did not report API_URL / ANON_KEY / SERVICE_ROLE_KEY)`)
  }

  return { url, anonKey, serviceRoleKey }
}

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } =
  resolveSupabaseTestConfig()

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

let counter = 0

export async function createAuthedUser(): Promise<{ userId: string; client: SupabaseClient }> {
  counter += 1
  const email = `test-user-${Date.now()}-${counter}@example.com`
  const password = 'test-password-123!'
  const admin = serviceClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`failed to create test user: ${createError?.message}`)
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email, password })
  if (signInError || !signedIn.session) {
    throw new Error(`failed to sign in test user: ${signInError?.message}`)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  })

  return { userId: created.user.id, client }
}
