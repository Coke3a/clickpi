import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'

interface Destination {
  id: number
  store_id: number
  label: string
  target_url: string
  active: boolean
}

export function DestinationsPage({ storeId }: { storeId: number }) {
  const { rows, loading, error, insert, update } = useCollection<Destination>('destinations', storeId)
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await insert({ label, target_url: targetUrl })
      setLabel('')
      setTargetUrl('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เพิ่มปลายทางไม่สำเร็จ')
    }
  }

  return (
    <section>
      <h2>ปลายทาง (Destinations)</h2>
      <form className="card" onSubmit={handleAdd}>
        <label>
          ชื่อปลายทาง
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          URL ปลายทาง
          <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required />
        </label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit">เพิ่มปลายทาง</button>
      </form>

      {loading && <p>กำลังโหลด...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((d) => (
          <li key={d.id}>
            <span>{d.label}</span> — <span>{d.target_url}</span>{' '}
            <button onClick={() => update(d.id, { active: !d.active })}>
              {d.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
