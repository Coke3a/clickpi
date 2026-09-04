export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

const BANGKOK_UTC_OFFSET = '+07:00'

/**
 * Converts an inclusive from/to calendar date pair (as picked in Asia/Bangkok
 * local time, matching how click data is bucketed elsewhere) into a UTC
 * timestamp range. `to` is the exclusive start of the day after the given
 * date, so the entire "to" calendar day is included.
 */
export function customDateRange(fromDate: string, toDate: string): { from: string; to: string } {
  const from = new Date(`${fromDate}T00:00:00${BANGKOK_UTC_OFFSET}`)
  const toExclusive = new Date(`${toDate}T00:00:00${BANGKOK_UTC_OFFSET}`)
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1)
  return { from: from.toISOString(), to: toExclusive.toISOString() }
}
