import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardLayout } from './DashboardLayout'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<p>content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signOut).mockReset()
  })

  it('calls signOut when the sign-out button is clicked', () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)

    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
