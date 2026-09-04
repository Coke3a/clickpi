import { supabase } from '../lib/supabaseClient'

export async function deleteClickHistory(storeId: number, range?: { from: string; to: string }): Promise<void> {
  let query = supabase.from('clicks').delete().eq('store_id', storeId)
  if (range) {
    query = query.gte('clicked_at', range.from).lt('clicked_at', range.to)
  }
  const { error } = await query
  if (error) throw error
}
