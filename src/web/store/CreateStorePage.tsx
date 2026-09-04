import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mascot } from '../components/Mascot'
import type { Store } from './useStore'
import '../auth/AuthLayout.css'

export function CreateStorePage({ onCreated }: { onCreated: (store: Store) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const { data, error: insertError } = await supabase
      .from('stores')
      .insert({ name, owner_user_id: userData.user!.id })
      .select()
      .single()
    setSubmitting(false)
    if (insertError || !data) {
      setError(insertError?.message ?? 'ไม่สามารถสร้างร้านค้าได้')
      return
    }
    onCreated(data as Store)
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <Mascot mood="happy" />
        <h1 className="auth-card__title">สร้างร้านค้าของคุณ</h1>
        <p className="auth-card__subtitle">ตั้งชื่อร้าน แล้วเริ่มติดตาม KPI ของทีมได้ทันที</p>
        <div className="auth-card__fields">
          <label>
            ชื่อร้าน
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="auth-card__actions">
          <button type="submit" className="auth-card__submit" disabled={submitting}>
            {submitting ? 'กำลังสร้าง...' : 'สร้างร้านค้า'}
          </button>
        </div>
      </form>
    </div>
  )
}
