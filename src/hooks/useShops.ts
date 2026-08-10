'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Shop } from '@/lib/supabase/types'

const SHOPS_QUERY_KEY = 'shops'
const supabase = supabaseBrowser()

async function fetchShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('verified', true)
    .eq('banned', false)
    .is('deleted_at', null)
    .order('rating', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Shop[]) ?? []
}

export function useShops() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: [SHOPS_QUERY_KEY],
    queryFn: fetchShops,
    staleTime: 60 * 1000, // 1 minuto — los comercios no cambian a cada rato
  })

  return {
    shops: data,
    loading: isLoading,
    error: error?.message ?? null,
    reload: refetch,
  }
}
