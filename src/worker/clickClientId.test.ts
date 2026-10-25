import { describe, it, expect } from 'vitest'
import { resolveClickClientId, serializeClickClientIdCookie, CLICK_CLIENT_ID_COOKIE } from './clickClientId'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXISTING_ID = '11111111-1111-4111-8111-111111111111'

describe('resolveClickClientId', () => {
  it('creates a fresh id when there is no cookie header', () => {
    const result = resolveClickClientId(null)

    expect(result.isNew).toBe(true)
    expect(result.clientId).toMatch(UUID_RE)
  })

  it('reuses the id from an existing cookie', () => {
    const result = resolveClickClientId(`${CLICK_CLIENT_ID_COOKIE}=${EXISTING_ID}`)

    expect(result).toEqual({ clientId: EXISTING_ID, isNew: false })
  })

  it('finds the cookie among other cookies on the header', () => {
    const result = resolveClickClientId(`foo=bar; ${CLICK_CLIENT_ID_COOKIE}=${EXISTING_ID}; baz=qux`)

    expect(result).toEqual({ clientId: EXISTING_ID, isNew: false })
  })

  it('creates a fresh id when the cookie value is not a valid id', () => {
    const result = resolveClickClientId(`${CLICK_CLIENT_ID_COOKIE}=not-a-uuid`)

    expect(result.isNew).toBe(true)
    expect(result.clientId).toMatch(UUID_RE)
  })
})

describe('serializeClickClientIdCookie', () => {
  it('builds a persistent, browser-only cookie for the given id', () => {
    const header = serializeClickClientIdCookie(EXISTING_ID)

    expect(header).toContain(`${CLICK_CLIENT_ID_COOKIE}=${EXISTING_ID}`)
    expect(header).toContain('HttpOnly')
    expect(header).toContain('Secure')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain('Max-Age=34560000')
  })
})
