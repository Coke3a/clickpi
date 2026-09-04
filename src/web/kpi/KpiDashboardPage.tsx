import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard, type LeaderboardRow } from './Leaderboard'
import { TrendChart, type TrendPoint } from './TrendChart'
import { lastNDaysRange, customDateRange } from './dateRangePresets'
import { deleteClickHistory } from './deleteClickHistory'
import { DeleteHistoryModal } from './DeleteHistoryModal'
import { toCsv, downloadCsv } from '../lib/csv'
import './KpiDashboardPage.css'

interface Destination {
  id: number
  label: string
}

export function KpiDashboardPage({ storeId }: { storeId: number }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('destinations')
      .select('id, label')
      .eq('store_id', storeId)
      .then(({ data }) => setDestinations((data ?? []) as Destination[]))
  }, [storeId])

  const loadKpiData = useCallback(() => {
    setLoading(true)
    return Promise.all([
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

  useEffect(() => {
    loadKpiData()
  }, [loadKpiData])

  function handleExport() {
    const csv = toCsv(leaderboard as unknown as Record<string, string | number>[])
    downloadCsv('kpi-leaderboard.csv', csv)
  }

  function handleCustomFromChange(value: string) {
    setCustomFrom(value)
    if (value && customTo) setRange(customDateRange(value, customTo))
  }

  function handleCustomToChange(value: string) {
    setCustomTo(value)
    if (customFrom && value) setRange(customDateRange(customFrom, value))
  }

  async function handleDeleteConfirm(deleteRange?: { from: string; to: string }) {
    await deleteClickHistory(storeId, deleteRange)
    setDeleteModalOpen(false)
    await loadKpiData()
  }

  return (
    <section className="kpi-page">
      <div className="kpi-page__heading">
        <div>
          <h2>ภาพรวม KPI</h2>
          <p className="kpi-page__subtitle">ผลงานพนักงานและแนวโน้มการคลิกลิงก์ในช่วงเวลาที่เลือก</p>
        </div>
        <button type="button" className="kpi-page__delete" onClick={() => setDeleteModalOpen(true)}>
          ลบประวัติ KPI
        </button>
      </div>

      <div className="card kpi-filters">
        <label>
          ช่วงเวลา
          <select onChange={(e) => setRange(lastNDaysRange(Number(e.target.value)))} defaultValue={30}>
            <option value={7}>7 วันล่าสุด</option>
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
          </select>
        </label>
        <label>
          ตั้งแต่วันที่
          <input type="date" value={customFrom} onChange={(e) => handleCustomFromChange(e.target.value)} />
        </label>
        <label>
          ถึงวันที่
          <input type="date" value={customTo} onChange={(e) => handleCustomToChange(e.target.value)} />
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
        <button type="button" className="kpi-filters__export" onClick={handleExport}>
          ส่งออก CSV
        </button>
      </div>

      {deleteModalOpen && (
        <DeleteHistoryModal onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} />
      )}

      {loading ? (
        <p className="kpi-page__loading">กำลังโหลด...</p>
      ) : (
        <div className="kpi-page__grid">
          <div className="card kpi-page__panel">
            <h3>แนวโน้มจำนวนคลิก</h3>
            <TrendChart points={trend} />
          </div>
          <div className="card kpi-page__panel">
            <h3>อันดับพนักงาน</h3>
            <Leaderboard rows={leaderboard} />
          </div>
        </div>
      )}
    </section>
  )
}
