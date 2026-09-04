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

  useEffect(() => {
    let cancelled = false
    supabase
      .from('stores')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setStore(data as Store | null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { store, loading, setStore }
}
