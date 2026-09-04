import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TrendChart, formatBucketDate, pickTickIndexes } from './TrendChart'

describe('formatBucketDate', () => {
  it('formats in Asia/Bangkok time, not UTC', () => {
    // 2026-09-04T17:30:00Z is 2026-09-05T00:30:00+07:00 in Bangkok — the
    // formatted date must read as day 5, not day 4 (the UTC day).
    const formatted = formatBucketDate('2026-09-04T17:30:00Z')
    expect(formatted).toContain('5')
    expect(formatted).not.toContain('4')
  })
})

describe('pickTickIndexes', () => {
  it('returns every index when the count is within the max', () => {
    expect(pickTickIndexes(3)).toEqual([0, 1, 2])
  })

  it('caps the number of ticks and always includes the first and last index', () => {
    const result = pickTickIndexes(30)
    expect(result.length).toBeLessThanOrEqual(5)
    expect(result[0]).toBe(0)
    expect(result[result.length - 1]).toBe(29)
  })

  it('returns an empty array for zero points', () => {
    expect(pickTickIndexes(0)).toEqual([])
  })
})

describe('TrendChart', () => {
  it('renders an empty state with no points', () => {
    render(<TrendChart points={[]} />)
    expect(screen.getByText('ยังไม่มีข้อมูลในช่วงเวลานี้')).toBeInTheDocument()
  })

  it('renders the chart with axis labels for its data points', () => {
    render(
      <TrendChart
        points={[
          { bucket: '2026-09-01T17:00:00Z', click_count: 2 },
          { bucket: '2026-09-02T17:00:00Z', click_count: 5 },
        ]}
      />
    )
    expect(screen.getByRole('img', { name: 'แนวโน้มจำนวนคลิกตามเวลา (เวลาประเทศไทย)' })).toBeInTheDocument()
    // The y-axis max-value label.
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
