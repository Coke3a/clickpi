import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeRedirectHandler } from './redirect'
import type { LinksRepository } from './linksRepository'
import { CLICK_CLIENT_ID_COOKIE } from './clickClientId'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXISTING_CLIENT_ID = '11111111-1111-4111-8111-111111111111'

function appWithRepository(repository: LinksRepository) {
  const app = new Hono()
  app.get('/r/:slug', makeRedirectHandler(repository))
  return app
}

function activeLink() {
  return {
    id: 1,
    storeId: 10,
    employeeId: 100,
    destinationId: 1000,
    targetUrl: 'https://maps.google.com/example',
  }
}

function fakeExecutionCtx(): ExecutionContext {
  return { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext
}

describe('GET /r/:slug', () => {
  it('redirects to the destination URL for an active link', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue({
        id: 1,
        storeId: 10,
        employeeId: 100,
        destinationId: 1000,
        targetUrl: 'https://maps.google.com/example',
      }),
      recordClick: vi.fn().mockResolvedValue(undefined),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/abc123', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://maps.google.com/example')
    expect(repository.findActiveLinkBySlug).toHaveBeenCalledWith('abc123')
  })

  it('serves a fallback page for an unknown or inactive slug, without recording a click', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue(null),
      recordClick: vi.fn(),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/does-not-exist', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(404)
    expect(await res.text()).toContain('ลิงก์นี้ไม่พร้อมใช้งานแล้ว')
    expect(repository.recordClick).not.toHaveBeenCalled()
  })

  it('still redirects even if recording the click fails', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue({
        id: 1,
        storeId: 10,
        employeeId: 100,
        destinationId: 1000,
        targetUrl: 'https://maps.google.com/example',
      }),
      recordClick: vi.fn().mockRejectedValue(new Error('insert failed')),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/abc123', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://maps.google.com/example')
  })

  it('sets a fresh client-id cookie and records the click under it when the request has none', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue(activeLink()),
      recordClick: vi.fn().mockResolvedValue(undefined),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/abc123', undefined, {}, fakeExecutionCtx())

    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toMatch(new RegExp(`^${CLICK_CLIENT_ID_COOKIE}=${UUID_RE.source.slice(1, -1)}`))
    const clientId = setCookie!.split(';')[0].split('=')[1]
    expect(repository.recordClick).toHaveBeenCalledWith(expect.objectContaining({ clientId }))
  })

  it('reuses the client id from an existing cookie without setting a new one', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue(activeLink()),
      recordClick: vi.fn().mockResolvedValue(undefined),
    }
    const app = appWithRepository(repository)

    const res = await app.request(
      '/r/abc123',
      { headers: { Cookie: `${CLICK_CLIENT_ID_COOKIE}=${EXISTING_CLIENT_ID}` } },
      {},
      fakeExecutionCtx()
    )

    expect(res.headers.get('set-cookie')).toBeNull()
    expect(repository.recordClick).toHaveBeenCalledWith(expect.objectContaining({ clientId: EXISTING_CLIENT_ID }))
  })
})
