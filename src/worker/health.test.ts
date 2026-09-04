import { describe, it, expect } from 'vitest'
import app from './index'

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
