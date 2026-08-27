'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Fila de `user_profiles` (0003:13–23) para el panel admin. Solo columnas
 * reales del esquema: `display_name` y `phone_e164`, no `name`/`phone`
 * (que no existen y hacían que la tabla mostrara «Sin nombre» y «—»).
 */
export interface AdminUser {
  id: string
  display_name: string | null
  email: string | null
  phone_e164: string | null
  role: string
  account_status: string
  created_at: string
}

/**
 * Usuarios del panel admin: SELECT directo sobre `user_profiles` (hay política
 * RLS `*_admin_read`, 0011:54) ordenado por registro, limitado a 500 (volumen
 * de piloto).
 *
 * Las MUTACIONES no se hacen aquí: el cambio de rol va por la RPC
 * `admin_set_user_role` (0009:2287) desde la página, porque sobre
 * `user_profiles` no hay política de UPDATE ni siquiera para admin.
 */
export function useAdminUsers() {
  const query = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<AdminUser[]> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as AdminUser[]
    },
    staleTime: 30 * 1000,
  })

  return {
    users: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? translateDbError(query.error) : '',
  }
}
