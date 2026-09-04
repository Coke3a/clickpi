import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('converts rows to a CSV string with a header row', () => {
    const csv = toCsv([
      { employee_name: 'Somchai', click_count: 5 },
      { employee_name: 'Nok', click_count: 2 },
    ])
    expect(csv).toBe('employee_name,click_count\nSomchai,5\nNok,2')
  })

  it('quotes values containing commas or quotes', () => {
    const csv = toCsv([{ employee_name: 'Somchai, "The Closer"', click_count: 5 }])
    expect(csv).toBe('employee_name,click_count\n"Somchai, ""The Closer""",5')
  })

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })
})
