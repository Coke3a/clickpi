import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { RedirectIfAuthenticated } from './RedirectIfAuthenticated'
import { useAuth } from './AuthProvider'

vi.mock('./AuthProvider', () => ({
  useAuth: vi.fn(),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/" element={<p>landing</p>} />
        </Route>
        <Route path="/app" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RedirectIfAuthenticated', () => {
  it('shows a loading state while the session is still resolving', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: true })

    renderAt('/')

    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument()
  })

  it('redirects to /app when a session already exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      session: { access_token: 'x' } as never,
      loading: false,
    })

    renderAt('/')

    expect(screen.getByText('dashboard')).toBeInTheDocument()
  })

  it('renders the guarded route when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false })

    renderAt('/')

    expect(screen.getByText('landing')).toBeInTheDocument()
  })
})
