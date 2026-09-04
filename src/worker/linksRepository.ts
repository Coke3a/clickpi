export interface LinkLookup {
  id: number
  storeId: number
  employeeId: number
  destinationId: number
  targetUrl: string
}

export interface RecordClickInput {
  linkId: number
  employeeId: number
  destinationId: number
  storeId: number
  ipAddress: string | null
  userAgent: string | null
  referrer: string | null
}

export interface LinksRepository {
  findActiveLinkBySlug(slug: string): Promise<LinkLookup | null>
  recordClick(input: RecordClickInput): Promise<void>
}
