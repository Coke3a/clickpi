import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard, type LeaderboardRow } from './Leaderboard'
import { TrendChart, type TrendPoint } from './TrendChart'
import { lastNDaysRange } from './dateRangePresets'
import { toCsv, downloadCsv } from '../lib/csv'

interface Destination {
  id: number
  label: string
}

export function KpiDashboardPage({ storeId }: { storeId: number }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
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
    Promise.all([
      supabase.rpc('get_leaderboard', { p_from: range.from, p_to: range.to, p_destination_id: destinationId }),
      supabase.rpc('get_click_trend', {
        p_from: range.from,
        p_to: range.to,
        p_destination_id: destinationId,
        p_granularity: 'day',
      }),
    ]).then(([leaderboardRes, trendRes]) => {
      setLeaderboard((leaderboardRes.data ?? []) as LeaderboardRow[])
      setTrend((trendRes.data ?? []) as TrendPoint[])
      setLoading(false)
    })
  }, [range, destinationId])

  function handleExport() {
    const csv = toCsv(leaderboard as unknown as Record<string, string | number>[])
    downloadCsv('kpi-leaderboard.csv', csv)
  }

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
        <button type="button" onClick={handleExport}>
          ส่งออก CSV
        </button>
      </div>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <>
          <TrendChart points={trend} />
          <Leaderboard rows={leaderboard} />
        </>
      )}
    </section>
  )
}
