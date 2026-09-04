import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'
import { Mascot } from '../components/Mascot'
import '../theme/listPage.css'

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
    <section className="list-page">
      <div className="list-page__heading">
        <h2>ปลายทาง (Destinations)</h2>
        <p className="list-page__subtitle">URL ปลายทางที่ลิงก์ของพนักงานจะพาลูกค้าไปถึง</p>
      </div>

      <form className="card list-form" onSubmit={handleAdd}>
        <label>
          ชื่อปลายทาง
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          URL ปลายทาง
          <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required />
        </label>
        <button type="submit" className="list-form__submit">
          เพิ่มปลายทาง
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
          <p>ยังไม่มีปลายทาง เพิ่มปลายทางแรกของคุณด้านบน</p>
        </div>
      ) : (
        <ul className="item-list">
          {rows.map((d) => (
            <li key={d.id} className="card item-row">
              <div className="item-row__info">
                <span className="item-row__title">{d.label}</span>
                <span className="item-row__meta">{d.target_url}</span>
              </div>
              <span className={`status-badge ${d.active ? 'status-badge--active' : 'status-badge--inactive'}`}>
                {d.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
              <button
                type="button"
                className="item-row__toggle"
                onClick={() => update(d.id, { active: !d.active })}
              >
                {d.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
