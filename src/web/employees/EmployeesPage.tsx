import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'
import { Mascot } from '../components/Mascot'
import '../theme/listPage.css'

interface Employee {
  id: number
  store_id: number
  name: string
  active: boolean
}

export function EmployeesPage({ storeId }: { storeId: number }) {
  const { rows, loading, error, insert, update } = useCollection<Employee>('employees', storeId)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await insert({ name })
      setName('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เพิ่มพนักงานไม่สำเร็จ')
    }
  }

  return (
    <section className="list-page">
      <div className="list-page__heading">
        <h2>พนักงาน (Employees)</h2>
        <p className="list-page__subtitle">พนักงานแต่ละคนจะได้ลิงก์ของตัวเองสำหรับทุกปลายทางโดยอัตโนมัติ</p>
      </div>

      <form className="card list-form" onSubmit={handleAdd}>
        <label>
          ชื่อพนักงาน
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button type="submit" className="list-form__submit">
          เพิ่มพนักงาน
        </button>
        {formError && (
          <p role="alert" className="list-form__error">
            {formError}
          </p>
        )}
      </form>

      {loading && <p className="list-page__loading">กำลังโหลด...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && rows.length === 0 ? (
        <div className="list-empty">
          <Mascot mood="idle" size={64} />
          <p>ยังไม่มีพนักงาน เพิ่มพนักงานคนแรกของคุณด้านบน</p>
        </div>
      ) : (
        <ul className="item-list">
          {rows.map((emp) => (
            <li key={emp.id} className="card item-row">
              <div className="item-row__info">
                <span className="item-row__title">{emp.name}</span>
              </div>
              <span className={`status-badge ${emp.active ? 'status-badge--active' : 'status-badge--inactive'}`}>
                {emp.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
              <button
                type="button"
                className="item-row__toggle"
                onClick={() => update(emp.id, { active: !emp.active })}
              >
                {emp.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
