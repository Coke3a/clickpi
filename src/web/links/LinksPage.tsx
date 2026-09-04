import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mascot } from '../components/Mascot'
import '../theme/listPage.css'
import './LinksPage.css'

interface LinkRow {
  id: number
  slug: string
  active: boolean
  employees: { name: string } | null
  destinations: { label: string } | null
}

export function LinksPage({ storeId }: { storeId: number }) {
  const [rows, setRows] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('links')
      .select('id, slug, active, employees(name), destinations(label)')
      .eq('store_id', storeId)
      .order('id', { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as unknown as LinkRow[])
        setLoading(false)
      })
  }, [storeId])

  async function handleCopy(link: LinkRow) {
    const url = `${window.location.origin}/r/${link.slug}`
    await navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000)
  }

  return (
    <section className="list-page">
      <div className="list-page__heading">
        <h2>ลิงก์ (Links)</h2>
        <p className="list-page__subtitle">ลิงก์ติดตามผลของพนักงานแต่ละคน แยกตามปลายทาง</p>
      </div>

      {loading ? (
        <p className="list-page__loading">กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <div className="list-empty">
          <Mascot mood="idle" size={64} />
          <p>ยังไม่มีลิงก์ เพิ่มพนักงานและปลายทางเพื่อสร้างลิงก์อัตโนมัติ</p>
        </div>
      ) : (
        <div className="card links-table__wrap">
          <table className="links-table">
            <thead>
              <tr>
                <th>พนักงาน</th>
                <th>ปลายทาง</th>
                <th>สถานะ</th>
                <th>ลิงก์</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((link) => (
                <tr key={link.id}>
                  <td>{link.employees?.name}</td>
                  <td>{link.destinations?.label}</td>
                  <td>
                    <span className={`status-badge ${link.active ? 'status-badge--active' : 'status-badge--inactive'}`}>
                      {link.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`links-table__copy${copiedId === link.id ? ' links-table__copy--copied' : ''}`}
                      onClick={() => handleCopy(link)}
                    >
                      {copiedId === link.id ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
