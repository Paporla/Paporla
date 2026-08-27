'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminCounts } from '@/lib/query/useAdminCounts'
import { useAdminTrend } from '@/components/admin/useAdminTrend'

export interface AdminSummary {
  totalUsers: number
  totalShops: number
  totalPacks: number
  totalReservations: number
}

/**
 * Estadísticas de la página /admin/stats.
 *
 * Fase 6: contadores sobre la RPC `admin_counts` (0027). Fase 6.5: el "top 5
 * comercios" sobre `admin_dashboard_trend` (0032) en vez de los
 * `.from('reservations')` + `.from('shops')` directos que el esquema (0012)
 * deniega a todo rol cliente (los gráficos salían vacíos sin avisar).
 * Las consultas de `user_profiles` (registros por día y distribución de
 * roles) siguen siendo directas: esa tabla SÍ tiene GRANT SELECT a
 * authenticated (0012) y RLS de lectura propia (0011).
 */
export function useAdminStats() {
  const supabase = supabaseBrowser()

  const countsQuery = useAdminCounts()
  const trend = useAdminTrend()

  const { data: userStats = [] } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      const lastDays = Array.from({ length: 30 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()
      const byDay = await Promise.all(
        lastDays.map(async (day) => {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${day}T00:00:00`)
            .lt('created_at', `${day}T23:59:59`)
          return { day: day.slice(5), registrations: count ?? 0 }
        }),
      )
      return byDay
    },
    staleTime: 60 * 1000,
  })

  const { data: roleDistribution = [] } = useQuery({
    queryKey: ['admin-role-distribution'],
    queryFn: async () => {
      const roles = ['user', 'comercio', 'admin', 'super_admin']
      const labels: Record<string, string> = {
        user: 'Usuarios',
        comercio: 'Comercios',
        admin: 'Admins',
        super_admin: 'Super Admins',
      }
      const roleData = await Promise.all(
        roles.map(async (r) => {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', r)
          return { name: labels[r] || r, value: count ?? 0 }
        }),
      )
      return roleData
    },
    staleTime: 60 * 1000,
  })

  const topShops = (trend.data?.top_shops ?? []).map((t) => ({
    name: t.name,
    reservations: t.reservations,
  }))

  const last7 = userStats.slice(-7).reduce((s, d) => s + d.registrations, 0)
  const prev7 = userStats.slice(-14, -7).reduce((s, d) => s + d.registrations, 0)
  const growth = { users: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0 }

  const raw = countsQuery.data ?? {
    users: 0,
    shops: 0,
    packs: 0,
    reservations: 0,
    verifiedShops: 0,
    bannedShops: 0,
    pendingShops: 0,
  }
  const summary: AdminSummary = {
    totalUsers: raw.users,
    totalShops: raw.shops,
    totalPacks: raw.packs,
    totalReservations: raw.reservations,
  }

  return {
    loading: countsQuery.isLoading || trend.isLoading,
    summary,
    userStats,
    roleDistribution,
    topShops,
    growth,
  }
}
