'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Fila que devuelve la RPC `list_admin_shops` (0027, Fase 6 H3): columnas
 * canónicas de `shops` (0003) + nombre y email del dueño. Nada de campos
 * inventados ni de la tip legacy `Shop` (que tenía `verified`/`banned`,
 * columnas que no existen en la tabla real).
 */
export interface AdminShop {
  shop_id: string
  owner_id: string | null
  owner_name: string | null
  owner_email: string | null
  name: string
  description: string | null
  category: string | null
  status: string
  status_reason: string | null
  address_line1: string | null
  phone_e164: string | null
  logo_path: string | null
  /** RUT declarado por el comercio, normalizado NNNNNNNN-D (0038/0039). */
  tax_id: string | null
  /** Nº de resolución sanitaria SEREMI declarado (0038/0039). */
  sanitary_resolution: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Listado de comercios del panel admin sobre la RPC canónica
 * `list_admin_shops` (0027), con filtro por estado.
 *
 * La versión anterior hacía `.select('*')` directo sobre `shops` y luego leía
 * `shop.verified`/`shop.banned` (columnas inexistentes), así que los badges
 * del listado siempre salían mal.
 *
 * `statusFilter === null` = todos los estados.
 */
export function useAdminShops(statusFilter: string | null) {
  const query = useQuery({
    queryKey: ['admin-shops', statusFilter],
    queryFn: async (): Promise<AdminShop[]> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('list_admin_shops', {
        p_status: statusFilter,
        p_search: null,
        p_before_created_at: null,
        p_before_shop_id: null,
        p_limit: 100,
      })
      if (error) throw error
      return (data ?? []) as AdminShop[]
    },
    staleTime: 30 * 1000,
  })

  return {
    shops: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? translateDbError(query.error) : '',
  }
}
