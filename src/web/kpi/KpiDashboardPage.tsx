import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard, type LeaderboardRow } from './Leaderboard'
import { lastNDaysRange } from './dateRangePresets'

interface Destination {
  id: number
  label: string
}

export function KpiDashboardPage({ storeId }: { storeId: number }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('destinations')
      .select('id, label')
      .eq('store_id', storeId)
      .then(({ data }) => setDestinations((data ?? []) as Destination[]))
  }, [storeId])

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_leaderboard', { p_from: range.from, p_to: range.to, p_destination_id: destinationId })
      .then(({ data }) => {
        setLeaderboard((data ?? []) as LeaderboardRow[])
        setLoading(false)
      })
  }, [range, destinationId])

  return (
    <section>
      <h2>ภาพรวม KPI</h2>
      <div className="kpi-filters">
        <label>
          ช่วงเวลา
          <select onChange={(e) => setRange(lastNDaysRange(Number(e.target.value)))} defaultValue={30}>
            <option value={7}>7 วันล่าสุด</option>
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
          </select>
        </label>
        <label>
          ปลายทาง
          <select
            onChange={(e) => setDestinationId(e.target.value ? Number(e.target.value) : null)}
            defaultValue=""
          >
            <option value="">ทั้งหมด</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p>กำลังโหลด...</p> : <Leaderboard rows={leaderboard} />}
    </section>
  )
}
