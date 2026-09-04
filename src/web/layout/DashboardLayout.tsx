import { NavLink, Outlet } from 'react-router-dom'

export function DashboardLayout() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>PAMM Map KPI</h1>
      </header>
      <nav className="app__nav">
        <NavLink to="/" end>
          ภาพรวม KPI
        </NavLink>
        <NavLink to="/destinations">ปลายทาง</NavLink>
        <NavLink to="/employees">พนักงาน</NavLink>
        <NavLink to="/links">ลิงก์</NavLink>
      </nav>
      <main className="app__content">
        <Outlet />
      </main>
    </div>
  )
}
