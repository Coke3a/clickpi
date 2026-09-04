import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <p>กำลังโหลด...</p>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
