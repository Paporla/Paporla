'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

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
 */
export function useAdminTrend() {
  const supabase = supabaseBrowser()

  return useQuery({
    queryKey: ['admin-dashboard-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_dashboard_trend')
      if (error) throw new Error(translateDbError(error))
      return data as unknown as AdminTrendData
    },
    staleTime: 60 * 1000,
  })
}
