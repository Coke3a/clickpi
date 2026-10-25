import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { RedirectIfAuthenticated } from './auth/RedirectIfAuthenticated'
import { LandingPage } from './landing/LandingPage'
import { useStore } from './store/useStore'
import { CreateStorePage } from './store/CreateStorePage'
import { DashboardLayout } from './layout/DashboardLayout'
import { DestinationsPage } from './destinations/DestinationsPage'
import { EmployeesPage } from './employees/EmployeesPage'
import { LinksPage } from './links/LinksPage'
import { KpiDashboardPage } from './kpi/KpiDashboardPage'

function StoreArea() {
  const { store, loading, error, setStore } = useStore()
  if (loading) return <p className="app-loading">กำลังโหลด...</p>
  if (error) return <p role="alert">เกิดข้อผิดพลาด: {error}</p>
  if (!store) return <CreateStorePage onCreated={setStore} />
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<KpiDashboardPage storeId={store.id} />} />
        <Route path="destinations" element={<DestinationsPage storeId={store.id} />} />
        <Route path="employees" element={<EmployeesPage storeId={store.id} />} />
        <Route path="links" element={<LinksPage storeId={store.id} />} />
      </Route>
    </Routes>
  )
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <p className="app-loading">กำลังโหลด...</p>
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/app/*" element={<StoreArea />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
