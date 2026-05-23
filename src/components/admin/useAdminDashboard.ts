'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminCounts } from '@/lib/query/useAdminCounts'

export interface AdminDashboardStats {
  totalUsers: number
  totalShops: number
  totalPacks: number
  totalReservations: number
  verifiedShops: number
  bannedShops: number
  pendingShops: number
}

export function useAdminDashboard() {
  const supabase = supabaseBrowser()

  const countsQuery = useAdminCounts()

  const chartQuery = useQuery({
    queryKey: ['admin-reservations-chart'],
    queryFn: async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()

      const byDay = await Promise.all(
        last7Days.map(async (day) => {
          const { count } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${day}T00:00:00`)
            .lt('created_at', `${day}T23:59:59`)
          return { day: day.slice(5), reservations: count || 0 }
        }),
      )
      return byDay
    },
    staleTime: 60 * 1000,
  })

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
    loading: countsQuery.isLoading || chartQuery.isLoading,
    stats: {
      totalUsers: data.users,
      totalShops: data.shops,
      totalPacks: data.packs,
      totalReservations: data.reservations,
      verifiedShops: data.verifiedShops,
      bannedShops: data.bannedShops,
      pendingShops: data.pendingShops,
    },
    reservationsByDay: chartQuery.data ?? [],
  }
}
