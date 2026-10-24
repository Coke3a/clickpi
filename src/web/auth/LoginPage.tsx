import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mascot } from '../components/Mascot'
import './AuthLayout.css'

type Mode = 'sign-in' | 'sign-up'

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setInfo(null)

    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) setError(signUpError.message)
      else setInfo('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน (ถ้าจำเป็น) แล้วเข้าสู่ระบบ')
    }

    setSubmitting(false)
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <Mascot mood={error ? 'idle' : 'happy'} />
        <h1 className="auth-card__title">{mode === 'sign-in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h1>
        <p className="auth-card__subtitle">ClicKPI — แดชบอร์ดติดตามผลงานทีมของคุณ</p>
        <div className="auth-card__fields">
          <label>
            อีเมล
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            รหัสผ่าน
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        {info && <p role="status">{info}</p>}
        <div className="auth-card__actions">
          <button type="submit" className="auth-card__submit" disabled={submitting}>
            {submitting ? 'กำลังดำเนินการ...' : mode === 'sign-in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
          <button
            type="button"
            className="auth-card__toggle"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          >
            {mode === 'sign-in' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </form>
    </div>
  )
}
