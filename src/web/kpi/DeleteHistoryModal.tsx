import { useId, useState } from 'react'
import { customDateRange } from './dateRangePresets'
import './DeleteHistoryModal.css'

type Scope = 'all' | 'range'

export interface DeleteHistoryModalProps {
  onClose: () => void
  onConfirm: (range?: { from: string; to: string }) => Promise<void> | void
}

export function DeleteHistoryModal({ onClose, onConfirm }: DeleteHistoryModalProps) {
  const groupName = useId()
  const [scope, setScope] = useState<Scope>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setError(null)

    let range: { from: string; to: string } | undefined
    if (scope === 'range') {
      if (!fromDate || !toDate) {
        setError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด')
        return
      }
      if (toDate < fromDate) {
        setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น')
        return
      }
      range = customDateRange(fromDate, toDate)
    }

    setSubmitting(true)
    try {
      await onConfirm(range)
    } catch (err) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
      return
    }
    setSubmitting(false)
  }

  return (
    <div className="delete-history-modal__overlay" onClick={onClose}>
      <div
        className="card delete-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label="ลบประวัติ KPI"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>ลบประวัติ KPI</h3>
        <p className="delete-history-modal__warning">การลบข้อมูลนี้ไม่สามารถกู้คืนได้</p>

        <fieldset className="delete-history-modal__scope">
          <label>
            <input
              type="radio"
              name={groupName}
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            ลบข้อมูลทั้งหมด
          </label>
          <label>
            <input
              type="radio"
              name={groupName}
              checked={scope === 'range'}
              onChange={() => setScope('range')}
            />
            ลบตามช่วงวันที่ที่กำหนด
          </label>
        </fieldset>

        {scope === 'range' && (
          <div className="delete-history-modal__range">
            <label>
              ตั้งแต่วันที่
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
              ถึงวันที่
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="delete-history-modal__error">
            {error}
          </p>
        )}

        <div className="delete-history-modal__actions">
          <button type="button" className="delete-history-modal__cancel" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="delete-history-modal__confirm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            ยืนยันลบ
          </button>
        </div>
      </div>
    </div>
  )
}
