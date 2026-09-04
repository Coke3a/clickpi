import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'

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
    <section>
      <h2>พนักงาน (Employees)</h2>
      <form className="card" onSubmit={handleAdd}>
        <label>
          ชื่อพนักงาน
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit">เพิ่มพนักงาน</button>
      </form>

      {loading && <p>กำลังโหลด...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((emp) => (
          <li key={emp.id}>
            <span>{emp.name}</span>{' '}
            <button onClick={() => update(emp.id, { active: !emp.active })}>
              {emp.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
