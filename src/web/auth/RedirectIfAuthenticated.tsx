import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RedirectIfAuthenticated() {
  const { session, loading } = useAuth()
  if (loading) return <p>กำลังโหลด...</p>
  if (session) return <Navigate to="/app" replace />
  return <Outlet />
}
