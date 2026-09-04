import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from './LoginPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
    vi.mocked(supabase.auth.signUp).mockReset()
  })

  it('signs in with the entered credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<LoginPage />)
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

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('toggles to sign-up mode and calls signUp', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'ยังไม่มีบัญชี? สมัครสมาชิก' }))
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
