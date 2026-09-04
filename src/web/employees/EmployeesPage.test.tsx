import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmployeesPage } from './EmployeesPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function mockFrom() {
  const insertResult = Promise.resolve({ data: null, error: null })
  const updateEq = vi.fn(() => insertResult)
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() =>
      Promise.resolve({ data: [{ id: 1, store_id: 10, name: 'Somchai', active: true }], error: null })
    ),
    insert: vi.fn(() => insertResult),
    update: vi.fn(() => ({ eq: updateEq })),
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lists existing employees', async () => {
    mockFrom()
    render(<EmployeesPage storeId={10} />)
    expect(await screen.findByText('Somchai')).toBeInTheDocument()
  })

  it('submits a new employee', async () => {
    const builder = mockFrom()
    render(<EmployeesPage storeId={10} />)
    await waitFor(() => expect(builder.order).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('ชื่อพนักงาน'), { target: { value: 'Nok' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มพนักงาน' }))

    await waitFor(() => expect(builder.insert).toHaveBeenCalledWith({ name: 'Nok', store_id: 10 }))
  })
})
