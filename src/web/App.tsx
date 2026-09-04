import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './auth/LoginPage'
import { useStore } from './store/useStore'
import { CreateStorePage } from './store/CreateStorePage'
import { DashboardLayout } from './layout/DashboardLayout'
import { DestinationsPage } from './destinations/DestinationsPage'
import { EmployeesPage } from './employees/EmployeesPage'
import { LinksPage } from './links/LinksPage'
import { KpiDashboardPage } from './kpi/KpiDashboardPage'

function StoreArea() {
  const { store, loading, setStore } = useStore()
  if (loading) return <p className="app-loading">กำลังโหลด...</p>
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
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/*" element={<StoreArea />} />
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
