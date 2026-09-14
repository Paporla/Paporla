'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Shop } from '@/lib/supabase/types'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

/**
 * L-42 (Lote Escaparate, commit B): el Shop del directorio con el indicador de
 * disponibilidad que devuelve `list_directory_shops` (0047). Vive aquí y no en
 * `lib/supabase/types` porque es un tipo de presentación del directorio: la
 * tarjeta y la página lo consumen para ordenar y etiquetar ("Sin packs ahora").
 */
export interface DirectoryShop extends Shop {
  has_available_packs: boolean
  available_pack_count: number
}

const SHOPS_QUERY_KEY = 'shops'
/* 0047 valida 1..100; el directorio no pagina todavía. */
const DIRECTORY_LIMIT = 100

/**
 * Fila tal y como la devuelve `list_directory_shops` (migración 0047).
 * `rating` viaja como numeric de Postgres (número o cadena según el driver):
 * se normaliza con Number() al mapear.
 */
type DirectoryRow = {
  shop_id: string
  name: string
  description: string | null
  locality_name: string | null
  logo_path: string | null
  cover_path: string | null
  rating: string | number | null
  rating_count: number
  has_available_packs: boolean
  available_pack_count: number
  updated_at: string
}

/**
 * L-42 (Lote Escaparate, commit B): el directorio ya NO se construye a partir
 * de los packs a la venta. Antes `useShops` llamaba a `search_available_packs`
 * y deduplicaba comercios: con el catálogo vacío, /shops no enseñaba NADA
 * aunque hubiera comercios verificados, y el estado vacío culpaba a los
 * filtros. Ahora una sola RPC (`list_directory_shops`, 0047) devuelve todos
 * los comercios verificados vivos del mercado, con o sin packs, más el
 * indicador de disponibilidad para ordenar y etiquetar.
 *
 * De paso queda enterrado el N+1 histórico: ni el bucle en serie de antes de
 * F1 ni el Promise.all de F1 hacen falta — la base resuelve todo en un viaje.
 *
 * El `verified: true` fijo no es un dato fabricado: es la garantía del WHERE
 * de 0047 (status='verified', deleted_at NULL, mercado pilot/active), igual
 * que lo era el de get_public_shop (0014).
 */
async function fetchDirectoryShops(): Promise<DirectoryShop[]> {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.rpc('list_directory_shops', {
    p_market_id: DEFAULT_MARKET.id,
    p_limit: DIRECTORY_LIMIT,
  })

  if (error) throw new Error(error.message)

  return ((data ?? []) as DirectoryRow[]).map((row) => {
    const logoPath = row.logo_path
    const coverPath = row.cover_path
    return {
      id: String(row.shop_id),
      name: String(row.name ?? ''),
      description: row.description ?? null,
      city: row.locality_name ?? '',
      cover_url: coverPath ? supabase.storage.from('shop-images').getPublicUrl(coverPath).data.publicUrl : null,
      logo_url: logoPath ? supabase.storage.from('shop-images').getPublicUrl(logoPath).data.publicUrl : null,
      rating: row.rating != null ? Number(row.rating) : 0,
      verified: true,
      has_available_packs: Boolean(row.has_available_packs),
      available_pack_count: Number(row.available_pack_count ?? 0),
    } as DirectoryShop
  })
}

export function useShops() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [SHOPS_QUERY_KEY, DEFAULT_MARKET.id],
    queryFn: fetchDirectoryShops,
    /*
     * Un comercio entra y sale del indicador de packs según pausa o reanuda,
     * y puede verificarse uno nuevo en cualquier momento: al volver a la
     * pestaña conviene repreguntar, como en el catálogo.
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
