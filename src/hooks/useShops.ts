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

  /*
   * Fix F1 (N+1): antes era un bucle for en serie — un get_public_shop
   * esperaba al anterior, así que el directorio tardaba N viajes
   * consecutivos. Ahora van en paralelo con Promise.all, que además
   * conserva el orden del catálogo. Y el error de un comercio ya no se
   * traga en silencio: salta y la página muestra el estado de error, porque
   * un directorio con comercios que desaparecen sin explicación es peor que
   * un error honesto.
   */
  const results = await Promise.all(
    ids.map(async (id): Promise<Shop | null> => {
      const { data: payload, error } = await supabase.rpc('get_public_shop', { p_shop_id: id })
      if (error) throw new Error(`No se pudo cargar el comercio ${id}: ${error.message}`)
      const raw = (payload as { shop?: Record<string, unknown> } | Record<string, unknown> | null) ?? null
      const row =
        raw && typeof raw === 'object' && 'shop' in raw && raw.shop
          ? (raw.shop as Record<string, unknown>)
          : (raw as Record<string, unknown> | null)
      // Fila vacía = el comercio dejó de ser público entre las dos consultas
      // (pausa, baja, mercado cerrado). No es un error: se omite y en paz.
      if (!row?.id) return null

      const logoPath = (row.logo_path as string | null) ?? null
      const coverPath = (row.cover_path as string | null) ?? null
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        description: (row.description as string | null) ?? null,
        city: (row.locality_name as string | null) ?? (row.city as string | null) ?? '',
        cover_url: coverPath ? supabase.storage.from('shop-images').getPublicUrl(coverPath).data.publicUrl : null,
        logo_url: logoPath ? supabase.storage.from('shop-images').getPublicUrl(logoPath).data.publicUrl : null,
        rating: row.rating != null ? Number(row.rating) : 0,
        /*
         * Fix F1 (datos fabricados): el `true` fijo parece inventado, pero es
         * consecuencia del filtro del servidor — get_public_shop solo devuelve
         * comercios con status='verified' (migración 0014), igual que
         * search_available_packs. Ningún comercio no verificado llega aquí.
         */
        verified: true,
      } as Shop
    }),
  )

  return results.filter((shop): shop is Shop => shop !== null)
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
