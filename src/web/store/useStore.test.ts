import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from './useStore'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function mockFrom(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

describe('useStore', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('returns the store on a successful fetch', async () => {
    mockFrom({ data: { id: 1, name: 'ร้านทดสอบ', owner_user_id: 'u1' }, error: null })

    const { result } = renderHook(() => useStore())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.store).toEqual({ id: 1, name: 'ร้านทดสอบ', owner_user_id: 'u1' })
    expect(result.current.error).toBeNull()
  })

  it('surfaces the error instead of silently falling through to onboarding', async () => {
    mockFrom({ data: null, error: { message: 'more than one row returned by a subquery' } })

    const { result } = renderHook(() => useStore())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('more than one row returned by a subquery')
    expect(result.current.store).toBeNull()
  })
})
