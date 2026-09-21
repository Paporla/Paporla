'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Fila que devuelve la RPC `list_admin_reservations` (0032): usuario desde
 * user_profiles (display_name, email) y comercio/pack desde las SNAPSHOTS de
 * la propia reserva (0005). Nada de campos inventados: es el mismo contrato
 * que la página servía en Fase 6.5, ahora también en el cliente.
 */
export interface AdminReservationRow {
  reservation_id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  shop_id: string
  shop_name: string | null
  shop_address: string | null
  pack_title: string | null
  total_amount_minor: number | string
  currency_code: string
  status: string
  payment_status: string
  pickup_start_at: string
  pickup_end_at: string
  timezone_snapshot: string
  created_at: string
  updated_at: string
}

/**
 * Listado de reservas del panel admin (ADMIN-1) sobre la RPC canónica
 * `list_admin_reservations` (0032, SECURITY DEFINER con is_admin).
 *
 * La RPC solo admite p_limit (1..500): pedimos el máximo y la búsqueda y el
 * filtro por estado se hacen EN EL CLIENTE, igual que la búsqueda de la
 * página de comercios (volumen de piloto). Cuando las reservas superen 500,
 * extender la RPC con p_status/p_search siguiendo el patrón de
 * `list_admin_shops` (0027) — decisión anotada en la entrega ADMIN-1.
 */
export function useAdminReservations() {
  const query = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: async (): Promise<AdminReservationRow[]> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('list_admin_reservations', {
        p_limit: 500,
      })
      if (error) throw error
      return (data ?? []) as AdminReservationRow[]
    },
    staleTime: 30 * 1000,
  })

  return {
    reservations: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? translateDbError(query.error) : '',
  }
}
