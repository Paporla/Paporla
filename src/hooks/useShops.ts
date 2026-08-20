'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Shop } from '@/lib/supabase/types'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

const SHOPS_QUERY_KEY = 'shops'

async function fetchShops(): Promise<Shop[]> {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.rpc('search_available_packs', {
    p_market_id: DEFAULT_MARKET.id,
    p_locality_id: undefined,
    p_latitude: undefined,
    p_longitude: undefined,
    p_radius_meters: 10000,
    p_query: undefined,
    p_limit: 50,
  })

  if (error) throw new Error(error.message)

  const byId = new Map<string, Shop>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = String(row.shop_id)
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      name: String(row.shop_name ?? ''),
      description: (row.description as string | null) ?? null,
      city: String(row.locality_name ?? ''),
      cover_url: null,
      rating: row.shop_rating != null ? Number(row.shop_rating) : 0,
      verified: true,
    } as Shop)
  }

  return [...byId.values()]
}

export function useShops() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [SHOPS_QUERY_KEY, DEFAULT_MARKET.id],
    queryFn: fetchShops,
    staleTime: 60 * 1000,
  })

  return {
    shops: data,
    loading: isLoading,
    error: error?.message ?? null,
    reload: refetch,
  }
}
