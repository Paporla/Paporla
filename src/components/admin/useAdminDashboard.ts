'use client'

import { useAdminCounts } from '@/lib/query/useAdminCounts'
import { useAdminTrend } from '@/components/admin/useAdminTrend'

export interface AdminDashboardStats {
  totalUsers: number
  totalShops: number
  totalPacks: number
  totalReservations: number
  verifiedShops: number
  bannedShops: number
  pendingShops: number
}

/**
 * Datos del dashboard admin (/admin).
 *
 * Fase 6: contadores sobre la RPC `admin_counts` (0027) en vez de los
 * `.select('verified, banned')` rotos. Fase 6.5: el gráfico de los últimos 7
 * días sobre `admin_dashboard_trend` (0032) en vez de 7 consultas head
 * `.from('reservations')` que el esquema (0012) deniega y que dejaban el
 * gráfico en ceros.
 */
export function useAdminDashboard() {
  const countsQuery = useAdminCounts()
  const trend = useAdminTrend()

  const data = countsQuery.data ?? {
    users: 0,
    shops: 0,
    packs: 0,
    reservations: 0,
    verifiedShops: 0,
    bannedShops: 0,
    pendingShops: 0,
  }

  return {
    loading: countsQuery.isLoading || trend.isLoading,
    stats: {
      totalUsers: data.users,
      totalShops: data.shops,
      totalPacks: data.packs,
      totalReservations: data.reservations,
      verifiedShops: data.verifiedShops,
      bannedShops: data.bannedShops,
      pendingShops: data.pendingShops,
    },
    reservationsByDay: (trend.data?.reservations_by_day ?? []).map((d) => ({
      day: d.day,
      reservations: d.count,
    })),
  }
}
