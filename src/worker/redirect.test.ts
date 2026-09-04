import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeRedirectHandler } from './redirect'
import type { LinksRepository } from './linksRepository'

function appWithRepository(repository: LinksRepository) {
  const app = new Hono()
  app.get('/r/:slug', makeRedirectHandler(repository))
  return app
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
})
