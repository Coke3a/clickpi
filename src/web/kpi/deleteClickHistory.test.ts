import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteClickHistory } from './deleteClickHistory'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function makeDeleteBuilder(result: { error: { message: string } | null }) {
  const builder = {
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

describe('deleteClickHistory', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('deletes all clicks for the store when no range is given', async () => {
    const builder = makeDeleteBuilder({ error: null })
    const deleteFn = vi.fn(() => builder)
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteFn } as never)

    await deleteClickHistory(10)

    expect(supabase.from).toHaveBeenCalledWith('clicks')
    expect(builder.eq).toHaveBeenCalledWith('store_id', 10)
    expect(builder.gte).not.toHaveBeenCalled()
    expect(builder.lt).not.toHaveBeenCalled()
  })

  it('deletes only clicks within the given range when a range is given', async () => {
    const builder = makeDeleteBuilder({ error: null })
    const deleteFn = vi.fn(() => builder)
    vi.mocked(supabase.from).mockReturnValue({ delete: deleteFn } as never)

    await deleteClickHistory(10, { from: '2026-09-01T00:00:00.000Z', to: '2026-09-02T00:00:00.000Z' })

    expect(builder.eq).toHaveBeenCalledWith('store_id', 10)
    expect(builder.gte).toHaveBeenCalledWith('clicked_at', '2026-09-01T00:00:00.000Z')
    expect(builder.lt).toHaveBeenCalledWith('clicked_at', '2026-09-02T00:00:00.000Z')
  })

  it('throws when supabase returns an error', async () => {
    const builder = makeDeleteBuilder({ error: { message: 'boom' } })
    vi.mocked(supabase.from).mockReturnValue({ delete: vi.fn(() => builder) } as never)

    await expect(deleteClickHistory(10)).rejects.toThrow('boom')
  })
})
