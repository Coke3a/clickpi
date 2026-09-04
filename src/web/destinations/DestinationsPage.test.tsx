import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DestinationsPage } from './DestinationsPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function mockFrom() {
  const insertResult = Promise.resolve({ data: null, error: null })
  const updateEq = vi.fn(() => insertResult)
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() =>
      Promise.resolve({
        data: [
          { id: 1, store_id: 10, label: 'Google Maps', target_url: 'https://maps.google.com/x', active: true },
        ],
        error: null,
      })
    ),
    insert: vi.fn(() => insertResult),
    update: vi.fn(() => ({ eq: updateEq })),
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

describe('DestinationsPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lists existing destinations', async () => {
    mockFrom()
    render(<DestinationsPage storeId={10} />)
    expect(await screen.findByText('Google Maps')).toBeInTheDocument()
  })

  it('submits a new destination', async () => {
    const builder = mockFrom()
    render(<DestinationsPage storeId={10} />)
    await waitFor(() => expect(builder.order).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('ชื่อปลายทาง'), { target: { value: 'TikTok' } })
    fireEvent.change(screen.getByLabelText('URL ปลายทาง'), { target: { value: 'https://tiktok.com/x' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มปลายทาง' }))

    await waitFor(() =>
      expect(builder.insert).toHaveBeenCalledWith({
        label: 'TikTok',
        target_url: 'https://tiktok.com/x',
        store_id: 10,
      })
    )
  })

  it('toggles a destination active/inactive', async () => {
    const builder = mockFrom()
    render(<DestinationsPage storeId={10} />)
    const toggle = await screen.findByRole('button', { name: 'ปิดใช้งาน' })
    fireEvent.click(toggle)

    await waitFor(() => expect(builder.update).toHaveBeenCalledWith({ active: false }))
  })
})
