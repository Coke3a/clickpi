import { Mascot } from '../components/Mascot'
import './Leaderboard.css'

export interface LeaderboardRow {
  employee_id: number
  employee_name: string
  click_count: number
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="leaderboard-empty">
        <Mascot mood="idle" size={64} />
        <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.click_count), 1)

  return (
    <ol className="leaderboard">
      {rows.map((row, index) => (
        <li key={row.employee_id} className="leaderboard__row">
          <span className={`leaderboard__rank${index < 3 ? ' leaderboard__rank--top' : ''}`}>{index + 1}</span>
          <span className="leaderboard__name">{row.employee_name}</span>
          <span className="leaderboard__count">{row.click_count}</span>
          <span className="leaderboard__track">
            <span className="leaderboard__bar" style={{ width: `${(row.click_count / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}
