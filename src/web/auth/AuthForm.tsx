import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import './AuthForm.css'

export type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
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

  function switchMode(next: AuthMode) {
    setError(null)
    setInfo(null)
    onModeChange(next)
  }

  const signIn = mode === 'sign-in'

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__tabs" role="tablist" aria-label="เลือกโหมด">
        <button
          type="button"
          role="tab"
          aria-selected={signIn}
          className="auth-form__tab"
          onClick={() => switchMode('sign-in')}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!signIn}
          className="auth-form__tab"
          onClick={() => switchMode('sign-up')}
        >
          สมัครฟรี
        </button>
      </div>
      <div className="auth-form__heading">
        <h2>{signIn ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีร้านของคุณ'}</h2>
        <p>{signIn ? 'เข้าสู่ระบบเพื่อดู KPI ของทีม' : 'ใช้อีเมลเดียว จัดการได้ทั้งร้าน'}</p>
      </div>
      <label>
        อีเมล
        <input
          type="email"
          autoComplete="email"
          placeholder="you@yourshop.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        รหัสผ่าน
        <input
          type="password"
          autoComplete={signIn ? 'current-password' : 'new-password'}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {info && <p role="status">{info}</p>}
      <button type="submit" className="auth-form__submit" disabled={submitting}>
        {submitting ? 'กำลังดำเนินการ...' : signIn ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
      </button>
    </form>
  )
}
