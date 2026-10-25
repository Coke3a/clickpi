export const CLICK_CLIENT_ID_COOKIE = 'pk_cid'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400 // 400 days: the cap browsers enforce on cookie lifetime

function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

export function resolveClickClientId(cookieHeader: string | null | undefined): {
  clientId: string
  isNew: boolean
} {
  const existing = readCookie(cookieHeader, CLICK_CLIENT_ID_COOKIE)
  if (existing && UUID_RE.test(existing)) {
    return { clientId: existing, isNew: false }
  }
  return { clientId: crypto.randomUUID(), isNew: true }
}

export function serializeClickClientIdCookie(clientId: string): string {
  return `${CLICK_CLIENT_ID_COOKIE}=${clientId}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}
