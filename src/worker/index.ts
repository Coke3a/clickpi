import { Hono } from 'hono'
import type { Env } from './env'
import { makeRedirectHandler } from './redirect'
import { createSupabaseLinksRepository } from './supabaseLinksRepository'

const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => c.json({ status: 'ok' }))

app.get('/r/:slug', (c) => {
  const repository = createSupabaseLinksRepository(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  return makeRedirectHandler(repository)(c)
})

export default app
