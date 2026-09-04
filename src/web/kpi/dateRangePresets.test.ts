import { describe, it, expect } from 'vitest'
import { customDateRange } from './dateRangePresets'

describe('customDateRange', () => {
  it('converts a from/to calendar date pair into a Thailand-time UTC range, inclusive of the whole "to" day', () => {
    const range = customDateRange('2026-09-01', '2026-09-03')

    expect(range.from).toBe('2026-08-31T17:00:00.000Z')
    expect(range.to).toBe('2026-09-03T17:00:00.000Z')
  })

  it('handles a single-day range', () => {
    const range = customDateRange('2026-01-01', '2026-01-01')

    expect(range.from).toBe('2025-12-31T17:00:00.000Z')
    expect(range.to).toBe('2026-01-01T17:00:00.000Z')
  })
})
