import { Mascot } from '../components/Mascot'
import './TrendChart.css'

export interface TrendPoint {
  bucket: string
  click_count: number
}

const WIDTH = 640
const HEIGHT = 220
const PADDING = 28
const AXIS_LABEL_HEIGHT = 20
const MAX_X_TICKS = 5

const bucketDateFormatter = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  day: 'numeric',
  month: 'short',
  calendar: 'gregory',
})

export function formatBucketDate(iso: string): string {
  return bucketDateFormatter.format(new Date(iso))
}

export function pickTickIndexes(count: number, maxTicks: number = MAX_X_TICKS): number[] {
  if (count <= 0) return []
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i)
  const step = (count - 1) / (maxTicks - 1)
  const indexes = Array.from({ length: maxTicks }, (_, i) => Math.round(i * step))
  return Array.from(new Set(indexes))
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="trend-chart-empty">
        <Mascot mood="idle" size={64} />
        <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>
      </div>
    )
  }

  const max = Math.max(...points.map((p) => p.click_count), 1)
  const plotBottom = HEIGHT - PADDING - AXIS_LABEL_HEIGHT
  const plotHeight = plotBottom - PADDING
  const stepX = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX
    const y = plotBottom - (p.click_count / max) * plotHeight
    return { x, y, point: p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${plotBottom} L${coords[0].x},${plotBottom} Z`
  const gridLines = [0.25, 0.5, 0.75].map((f) => plotBottom - f * plotHeight)
  const tickIndexes = pickTickIndexes(coords.length)

  return (
    <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="แนวโน้มจำนวนคลิกตามเวลา (เวลาประเทศไทย)">
      {gridLines.map((y) => (
        <line key={y} x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y} stroke="var(--chart-gridline)" strokeWidth={1} />
      ))}
      <line x1={PADDING} y1={plotBottom} x2={WIDTH - PADDING} y2={plotBottom} stroke="var(--chart-baseline)" strokeWidth={1} />
      <text x={PADDING} y={PADDING - 8} className="trend-chart__axis-label" textAnchor="start">
        {max}
      </text>
      <text x={PADDING} y={plotBottom - 4} className="trend-chart__axis-label" textAnchor="start">
        0
      </text>
      <path d={areaPath} fill="var(--chart-series-1)" opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke="var(--chart-series-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c) => (
        <circle key={c.point.bucket} cx={c.x} cy={c.y} r={4} fill="var(--chart-series-1)" stroke="var(--chart-surface)" strokeWidth={1.5} />
      ))}
      {tickIndexes.map((i) => (
        <text
          key={coords[i].point.bucket}
          x={coords[i].x}
          y={HEIGHT - 6}
          className="trend-chart__axis-label"
          textAnchor="middle"
        >
          {formatBucketDate(coords[i].point.bucket)}
        </text>
      ))}
    </svg>
  )
}
