import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Store {
  id: number
  name: string
  owner_user_id: string
}

export function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('stores')
      .select('*')
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!cancelled) {
          if (fetchError) setError(fetchError.message)
          else setStore(data as Store | null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { store, loading, error, setStore }
}
