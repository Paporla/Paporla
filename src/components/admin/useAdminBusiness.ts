'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Números de negocio que devuelve la RPC `admin_business_snapshot` (0055,
 * ADMIN-3): agregados sobre TODAS las reservas (SQL), no sobre el listado
 * de a 500. La moneda es la más frecuente entre reservas (piloto = CLP) y
 * puede venir null si no hay ninguna: el cliente usa CLP por defecto.
 */
export interface AdminBusinessSnapshot {
  paid_count: number
  revenue_minor: number | string
  units_saved: number
  cancelled_count: number
  no_show_count: number
  total_count: number
  cancel_rate: number | string
  packs_active: number
  packs_paused: number
  currency: string | null
}

export function useAdminBusiness() {
  const query = useQuery({
    queryKey: ['admin-business'],
    queryFn: async (): Promise<AdminBusinessSnapshot | null> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('admin_business_snapshot')
      if (error) throw error
      return (data ?? null) as AdminBusinessSnapshot | null
    },
    staleTime: 30 * 1000,
  })

  return {
    business: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? translateDbError(query.error) : '',
  }
}
