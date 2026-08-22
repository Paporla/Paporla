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

  const ids: string[] = []
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = String(row.shop_id)
    if (!ids.includes(id)) ids.push(id)
  }

  const shops: Shop[] = []
  for (const id of ids) {
    const { data: payload } = await supabase.rpc('get_public_shop', { p_shop_id: id })
    const raw = (payload as { shop?: Record<string, unknown> } | Record<string, unknown> | null) ?? null
    const row =
      raw && typeof raw === 'object' && 'shop' in raw && raw.shop
        ? (raw.shop as Record<string, unknown>)
        : (raw as Record<string, unknown> | null)
    if (!row?.id) continue

    const logoPath = (row.logo_path as string | null) ?? null
    const coverPath = (row.cover_path as string | null) ?? null
    shops.push({
      id: String(row.id),
      name: String(row.name ?? ''),
      description: (row.description as string | null) ?? null,
      city: (row.locality_name as string | null) ?? (row.city as string | null) ?? '',
      cover_url: coverPath ? supabase.storage.from('shop-images').getPublicUrl(coverPath).data.publicUrl : null,
      logo_url: logoPath ? supabase.storage.from('shop-images').getPublicUrl(logoPath).data.publicUrl : null,
      rating: row.rating != null ? Number(row.rating) : 0,
      verified: true,
    } as Shop)
  }

  return shops
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
    /*
     * Mismo motivo que en el catálogo de packs: el directorio se construye a
     * partir de los packs a la venta, así que un comercio entra y sale de la
     * lista según pausa o reanuda. Si no refrescamos al volver a la pestaña,
     * el cliente ve comercios que ya no tienen nada que ofrecer.
     */
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  return {
    shops: data,
    loading: isLoading,
    error: error?.message ?? null,
    reload: refetch,
  }
}
