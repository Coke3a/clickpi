import { createClient } from '@supabase/supabase-js'
import type { LinksRepository, LinkLookup, RecordClickInput } from './linksRepository'

export function createSupabaseLinksRepository(url: string, serviceRoleKey: string): LinksRepository {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

  return {
    async findActiveLinkBySlug(slug: string): Promise<LinkLookup | null> {
      const { data, error } = await supabase
        .from('links')
        .select(
          `id, active, store_id,
           employee:employees!inner(id, active),
           destination:destinations!inner(id, active, target_url)`
        )
        .eq('slug', slug)
        .maybeSingle()

      if (error || !data) return null

      const employee = (data as any).employee as { id: number; active: boolean } | null
      const destination = (data as any).destination as { id: number; active: boolean; target_url: string } | null

      if (!data.active || !employee?.active || !destination?.active) return null

      return {
        id: data.id,
        storeId: data.store_id,
        employeeId: employee.id,
        destinationId: destination.id,
        targetUrl: destination.target_url,
      }
    },

    async recordClick(input: RecordClickInput): Promise<void> {
      const { error } = await supabase.from('clicks').insert({
        link_id: input.linkId,
        employee_id: input.employeeId,
        destination_id: input.destinationId,
        store_id: input.storeId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        referrer: input.referrer,
      })
      if (error) throw error
    },
  }
}
