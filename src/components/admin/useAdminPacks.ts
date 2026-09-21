'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Fila que devuelve la RPC `list_admin_packs` (0032): columnas canónicas de
 * `packs` (0004) + nombre del comercio. Nada de campos inventados.
 */
export interface AdminPackRow {
  pack_id: string
  shop_id: string
  shop_name: string | null
  title: string
  description: string | null
  category: string | null
  price_minor: number | string
  original_price_minor: number | string | null
  currency_code: string
  total_stock: number
  remaining_stock: number
  status: string
  pickup_start_at: string
  pickup_end_at: string
  timezone_snapshot: string
  image_path: string | null
  created_at: string
  updated_at: string
}

/**
 * Listado de packs del panel admin (ADMIN-2) sobre la RPC canónica
 * `list_admin_packs` (0032). La RPC solo admite p_limit (1..500): pedimos 200
 * y la búsqueda y el filtro por estado se hacen EN EL CLIENTE, mismo patrón
 * que reservas y comercios.
 */
export function useAdminPacks() {
  const query = useQuery({
    queryKey: ['admin-packs'],
    queryFn: async (): Promise<AdminPackRow[]> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('list_admin_packs', {
        p_limit: 200,
      })
      if (error) throw error
      return (data ?? []) as AdminPackRow[]
    },
    staleTime: 30 * 1000,
  })

  return {
    packs: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? translateDbError(query.error) : '',
  }
}
