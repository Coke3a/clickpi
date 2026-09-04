import './TrendChart.css'

export interface TrendPoint {
  bucket: string
  click_count: number
}

const WIDTH = 640
const HEIGHT = 200
const PADDING = 24

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>

  const max = Math.max(...points.map((p) => p.click_count), 1)
  const stepX = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX
    const y = HEIGHT - PADDING - (p.click_count / max) * (HEIGHT - PADDING * 2)
    return { x, y, point: p }
  })

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')

  return (
    <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="แนวโน้มจำนวนคลิกตามเวลา">
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--chart-baseline)"
        strokeWidth={1}
      />
      <path d={path} fill="none" stroke="var(--chart-series-1)" strokeWidth={2} strokeLinecap="round" />
      {coords.map((c) => (
        <circle key={c.point.bucket} cx={c.x} cy={c.y} r={4} fill="var(--chart-series-1)" />
      ))}
    </svg>
  )
}
