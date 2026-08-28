'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { RpcTimeoutError, rpcWithTimeout } from '@/lib/utils/rpcWithTimeout'

/** Forma que devuelve la RPC `admin_counts` (0027, Fase 6 H2). */
export interface AdminCountsData {
  users: number
  packs: number
  reservations: number
  shops: {
    total: number
    /** Solo trae claves de estados que tienen al menos un comercio. */
    by_status: Record<string, number>
  }
}

/**
 * Forma que consume la UI (se mantiene la de siempre para no tocar las
 * tarjetas del dashboard, y se agrega `byStatus` para los filtros del
 * listado de comercios).
 */
export interface AdminCounts {
  users: number
  shops: number
  packs: number
  reservations: number
  verifiedShops: number
  bannedShops: number
  pendingShops: number
  byStatus: Record<string, number>
}

/**
 * Contadores del panel admin sobre la RPC canónica `admin_counts` (0027).
 *
 * La versión anterior hacía `.select('verified, banned')` sobre `shops`:
 * esas columnas NO existen en la tabla real (0003 tiene `status`), así que la
 * consulta fallaba siempre y el dashboard mostraba ceros en silencio.
 *
 * Mapeo a la forma legacy:
 *  - bannedShops  = suspended (la suspensión ES el «ban» del modelo canónico)
 *  - pendingShops = draft + pending_review
 *
 * FASE 6.6: la RPC va en carrera contra un timeout de 30 s (rpcWithTimeout):
 * si PostgREST no responde, la consulta pasa a estado de error en vez de
 * dejar /admin y /admin/stats en el skeleton para siempre.
 */
export function useAdminCounts() {
  return useQuery({
    queryKey: ['admin-counts'],
    queryFn: async (): Promise<AdminCounts> => {
      const supabase = supabaseBrowser()
      let result: { data: AdminCountsData | null; error: { message: string; code?: string } | null }
      try {
        result = await rpcWithTimeout(supabase.rpc('admin_counts'), 'admin_counts')
      } catch (e) {
        if (e instanceof RpcTimeoutError) {
          throw new Error('La conexión con la base de datos tardó demasiado en responder. Vuelve a intentarlo.')
        }
        throw e
      }
      if (result.error) throw result.error

      const rows = (result.data ?? {}) as Partial<AdminCountsData>
      const byStatus = rows.shops?.by_status ?? {}
      return {
        users: rows.users ?? 0,
        shops: rows.shops?.total ?? 0,
        packs: rows.packs ?? 0,
        reservations: rows.reservations ?? 0,
        verifiedShops: byStatus.verified ?? 0,
        bannedShops: byStatus.suspended ?? 0,
        pendingShops: (byStatus.draft ?? 0) + (byStatus.pending_review ?? 0),
        byStatus,
      }
    },
    staleTime: 60 * 1000,
  })
}
