'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'
import { RpcTimeoutError, rpcWithTimeout } from '@/lib/utils/rpcWithTimeout'

/**
 * Fila de tendencia diaria (RPC `admin_dashboard_trend`, 0032, Fase 6.5).
 */
export interface TrendDay {
  day: string
  count: number
}

/**
 * Fila de tendencia mensual: ingresos de reservas picked_up en la unidad
 * menor de `currency_code`, y la comisión provisional del 10%.
 */
export interface TrendMonth {
  month: string
  revenue_minor: number
  commissions_minor: number
  count: number
}

/**
 * Comercio del top 5 por volumen de reservas.
 */
export interface TrendTopShop {
  shop_id: string
  name: string
  reservations: number
}

export interface AdminTrendData {
  reservations_by_day: TrendDay[]
  revenue_by_month: TrendMonth[]
  top_shops: TrendTopShop[]
  currency_code: string
}

/**
 * Series de tendencia del panel admin sobre la RPC canónica
 * `admin_dashboard_trend` (0032, Fase 6.5).
 *
 * Reemplaza los N+1 de `.from('reservations')` directo que hacían
 * RevenueChart, useAdminDashboard y useAdminStats: el esquema (0012) no
 * concede SELECT sobre `reservations` a ningún rol cliente, así que esas
 * lecturas fallaban ("permission denied for table reservations") y los
 * gráficos del dashboard salían en ceros sin que nadie lo viera.
 *
 * FASE 6.6: la RPC va en carrera contra un timeout de 30 s
 * (rpcWithTimeout): si PostgREST no responde, la consulta pasa a estado de
 * error y el panel lo muestra en vez de quedarse en el skeleton para siempre.
 */
export function useAdminTrend() {
  const supabase = supabaseBrowser()

  return useQuery({
    queryKey: ['admin-dashboard-trend'],
    queryFn: async () => {
      let result: { data: AdminTrendData | null; error: { message: string; code?: string } | null }
      try {
        result = await rpcWithTimeout(supabase.rpc('admin_dashboard_trend'), 'admin_dashboard_trend')
      } catch (e) {
        if (e instanceof RpcTimeoutError) {
          throw new Error('La conexión con la base de datos tardó demasiado en responder. Vuelve a intentarlo.')
        }
        throw e
      }
      if (result.error) throw new Error(translateDbError(result.error))
      return result.data as unknown as AdminTrendData
    },
    staleTime: 60 * 1000,
  })
}
