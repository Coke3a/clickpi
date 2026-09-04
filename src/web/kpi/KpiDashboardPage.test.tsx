import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KpiDashboardPage } from './KpiDashboardPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))

describe('KpiDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.rpc).mockReset()

    const destinationsBuilder = {
      select: vi.fn(() => destinationsBuilder),
      eq: vi.fn(() => Promise.resolve({ data: [{ id: 1, label: 'Google Maps' }], error: null })),
    }
    vi.mocked(supabase.from).mockReturnValue(destinationsBuilder as never)

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
})
