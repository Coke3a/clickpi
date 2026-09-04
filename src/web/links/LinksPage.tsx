import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

  if (loading) return <p>กำลังโหลด...</p>

  return (
    <section>
      <h2>ลิงก์ (Links)</h2>
      <table>
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
              <td>{link.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</td>
              <td>
                <button onClick={() => handleCopy(link)}>
                  {copiedId === link.id ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
