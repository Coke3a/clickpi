import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthForm, type AuthMode } from './AuthForm'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } },
}))

function Harness() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  return <AuthForm mode={mode} onModeChange={setMode} />
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
    vi.mocked(supabase.auth.signUp).mockReset()
  })

  it('signs in with the entered credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<Harness />)
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'secret123',
      })
    )
  })

  it('shows an error message when sign-in fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)

    render(<Harness />)
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('switches to sign-up via the tab and calls signUp', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: 'สมัครฟรี' }))
    expect(screen.getByRole('tab', { name: 'สมัครฟรี' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'new-owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }))

    await waitFor(() =>
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new-owner@example.com',
        password: 'secret123',
      })
    )
  })
})
