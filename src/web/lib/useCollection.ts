import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export interface CollectionRow {
  id: number
  active: boolean
}

export function useCollection<T extends CollectionRow>(table: string, storeId: number) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: selectError } = await supabase
      .from(table)
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
    if (selectError) setError(selectError.message)
    else setRows((data ?? []) as T[])
    setLoading(false)
  }, [table, storeId])

  useEffect(() => {
    reload()
  }, [reload])

  const insert = useCallback(
    async (values: Record<string, unknown>) => {
      const { error: insertError } = await supabase.from(table).insert({ ...values, store_id: storeId })
      if (insertError) throw insertError
      await reload()
    },
    [table, storeId, reload]
  )

  const update = useCallback(
    async (id: number, values: Record<string, unknown>) => {
      const { error: updateError } = await supabase.from(table).update(values).eq('id', id)
      if (updateError) throw updateError
      await reload()
    },
    [table, reload]
  )

  return { rows, loading, error, insert, update, reload }
}
