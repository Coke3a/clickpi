import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './DashboardLayout.css'

export function DashboardLayout() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <svg className="app__brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C7.6 2 4 5.4 4 9.6 4 15 10 20 11.4 21.9a.75.75 0 0 0 1.2 0C13.9 20 20 15 20 9.6 20 5.4 16.4 2 12 2Z"
              fill="var(--c-accent)"
            />
            <circle cx="12" cy="9.6" r="3.4" fill="var(--c-surface)" />
          </svg>
          <h1>PAMM Map KPI</h1>
        </div>
        <nav className="app__nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'app__nav-link app__nav-link--active' : 'app__nav-link')}>
            ภาพรวม KPI
          </NavLink>
          <NavLink
            to="/destinations"
            className={({ isActive }) => (isActive ? 'app__nav-link app__nav-link--active' : 'app__nav-link')}
          >
            ปลายทาง
          </NavLink>
          <NavLink
            to="/employees"
            className={({ isActive }) => (isActive ? 'app__nav-link app__nav-link--active' : 'app__nav-link')}
          >
            พนักงาน
          </NavLink>
          <NavLink
            to="/links"
            className={({ isActive }) => (isActive ? 'app__nav-link app__nav-link--active' : 'app__nav-link')}
          >
            ลิงก์
          </NavLink>
        </nav>
        <button type="button" className="app__sign-out" onClick={() => supabase.auth.signOut()}>
          ออกจากระบบ
        </button>
      </header>
      <main className="app__content">
        <Outlet />
      </main>
    </div>
  )
}
