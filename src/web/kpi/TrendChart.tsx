import { Mascot } from '../components/Mascot'
import './TrendChart.css'

export interface TrendPoint {
  bucket: string
  click_count: number
}

const WIDTH = 640
const HEIGHT = 220
const PADDING = 28

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
  const stepX = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX
    const y = HEIGHT - PADDING - (p.click_count / max) * (HEIGHT - PADDING * 2)
    return { x, y, point: p }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${HEIGHT - PADDING} L${coords[0].x},${HEIGHT - PADDING} Z`
  const gridLines = [0.25, 0.5, 0.75].map((f) => HEIGHT - PADDING - f * (HEIGHT - PADDING * 2))

  return (
    <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="แนวโน้มจำนวนคลิกตามเวลา">
      {gridLines.map((y) => (
        <line key={y} x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y} stroke="var(--chart-gridline)" strokeWidth={1} />
      ))}
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--chart-baseline)"
        strokeWidth={1}
      />
      <path d={areaPath} fill="var(--chart-series-1)" opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke="var(--chart-series-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c) => (
        <circle key={c.point.bucket} cx={c.x} cy={c.y} r={4} fill="var(--chart-series-1)" stroke="var(--chart-surface)" strokeWidth={1.5} />
      ))}
    </svg>
  )
}
