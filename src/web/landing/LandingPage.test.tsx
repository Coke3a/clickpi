import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LandingPage } from './LandingPage'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } },
}))

describe('LandingPage', () => {
  it('shows the pitch and the sign-in form together', () => {
    render(<LandingPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ชวนลูกค้าไปรีวิวร้านได้มากที่สุด')
    expect(screen.getByLabelText('อีเมล')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
  })

  it('switches the form to sign-up from the closing call to action', () => {
    render(<LandingPage />)

    fireEvent.click(screen.getByRole('link', { name: 'เริ่มใช้งานฟรี' }))

    expect(screen.getByRole('tab', { name: 'สมัครฟรี' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'สมัครสมาชิก' })).toBeInTheDocument()
  })
})
