import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KpiDashboardPage } from './KpiDashboardPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))

function makeDeleteBuilder(result: { error: { message: string } | null } = { error: null }) {
  const builder = {
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

describe('KpiDashboardPage', () => {
  let deleteBuilder: ReturnType<typeof makeDeleteBuilder>
  let deleteFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.rpc).mockReset()

    const destinationsBuilder = {
      select: vi.fn(() => destinationsBuilder),
      eq: vi.fn(() => Promise.resolve({ data: [{ id: 1, label: 'Google Maps' }], error: null })),
    }
    deleteBuilder = makeDeleteBuilder()
    deleteFn = vi.fn(() => deleteBuilder)

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clicks') return { delete: deleteFn } as never
      return destinationsBuilder as never
    })

    vi.mocked(supabase.rpc).mockImplementation((fnName: string) => {
      if (fnName === 'get_leaderboard') {
        return Promise.resolve({
          data: [
            { employee_id: 1, employee_name: 'Somchai', click_count: 5 },
            { employee_id: 2, employee_name: 'Nok', click_count: 2 },
          ],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: [], error: null }) as never
    })
  })

  it('renders the leaderboard ranked by click count', async () => {
    render(<KpiDashboardPage storeId={10} />)

    expect(await screen.findByText('Somchai')).toBeInTheDocument()
    expect(screen.getByText('Nok')).toBeInTheDocument()
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_leaderboard',
      expect.objectContaining({ p_destination_id: null })
    )
  })

  it('renders the trend chart and exports CSV on demand', async () => {
    vi.mocked(supabase.rpc).mockImplementation((fnName: string) => {
      if (fnName === 'get_leaderboard') {
        return Promise.resolve({
          data: [{ employee_id: 1, employee_name: 'Somchai', click_count: 5 }],
          error: null,
        }) as never
      }
      if (fnName === 'get_click_trend') {
        return Promise.resolve({
          data: [{ bucket: '2026-09-01T00:00:00Z', click_count: 5 }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: [], error: null }) as never
    })

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()

    render(<KpiDashboardPage storeId={10} />)

    expect(await screen.findByRole('img', { name: 'แนวโน้มจำนวนคลิกตามเวลา (เวลาประเทศไทย)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ส่งออก CSV' }))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('applies a custom date range typed into the from/to pickers', async () => {
    render(<KpiDashboardPage storeId={10} />)
    await screen.findByText('Somchai')
    vi.mocked(supabase.rpc).mockClear()

    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-09-03' } })

    await screen.findByText('Somchai')
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_leaderboard',
      expect.objectContaining({ p_from: '2026-08-31T17:00:00.000Z', p_to: '2026-09-03T17:00:00.000Z' })
    )
  })

  it('opens the delete-history modal, deletes all clicks for the store, and reloads the KPI data', async () => {
    render(<KpiDashboardPage storeId={10} />)
    await screen.findByText('Somchai')
    const rpcCallsBeforeDelete = vi.mocked(supabase.rpc).mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'ลบประวัติ KPI' }))
    expect(screen.getByRole('dialog', { name: 'ลบประวัติ KPI' })).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))
    })

    expect(deleteFn).toHaveBeenCalled()
    expect(deleteBuilder.eq).toHaveBeenCalledWith('store_id', 10)
    expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(rpcCallsBeforeDelete)
    expect(screen.queryByRole('dialog', { name: 'ลบประวัติ KPI' })).not.toBeInTheDocument()
  })

  it('closes the delete-history modal without deleting when cancelled', async () => {
    render(<KpiDashboardPage storeId={10} />)
    await screen.findByText('Somchai')

    fireEvent.click(screen.getByRole('button', { name: 'ลบประวัติ KPI' }))
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))

    expect(deleteFn).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'ลบประวัติ KPI' })).not.toBeInTheDocument()
  })
})
