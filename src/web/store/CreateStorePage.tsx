import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Store } from './useStore'

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
    <div className="login-page">
      <form className="card login-page__form" onSubmit={handleSubmit}>
        <h1>สร้างร้านค้าของคุณ</h1>
        <label>
          ชื่อร้าน
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังสร้าง...' : 'สร้างร้านค้า'}
        </button>
      </form>
    </div>
  )
}
