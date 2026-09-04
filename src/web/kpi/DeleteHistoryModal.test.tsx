import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteHistoryModal } from './DeleteHistoryModal'

describe('DeleteHistoryModal', () => {
  it('confirms a full delete (no range) by default', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<DeleteHistoryModal onConfirm={onConfirm} onClose={onClose} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))
    })

    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('reveals date range inputs when the range scope is chosen, and confirms with the converted range', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DeleteHistoryModal onConfirm={onConfirm} onClose={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('ลบตามช่วงวันที่ที่กำหนด'))
    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-09-03' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))
    })

    expect(onConfirm).toHaveBeenCalledWith({ from: '2026-08-31T17:00:00.000Z', to: '2026-09-03T17:00:00.000Z' })
  })

  it('shows a validation error and does not confirm when the end date is before the start date', () => {
    const onConfirm = vi.fn()
    render(<DeleteHistoryModal onConfirm={onConfirm} onClose={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('ลบตามช่วงวันที่ที่กำหนด'))
    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2026-09-03' } })
    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันลบ' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onClose when cancelled', () => {
    const onClose = vi.fn()
    render(<DeleteHistoryModal onConfirm={vi.fn()} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))

    expect(onClose).toHaveBeenCalled()
  })
})
