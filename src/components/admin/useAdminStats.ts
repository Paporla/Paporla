'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminCounts } from '@/lib/query/useAdminCounts'

export interface AdminSummary {
  totalUsers: number
  totalShops: number
  totalPacks: number
  totalReservations: number
}

export function useAdminStats() {
  const supabase = supabaseBrowser()

  const countsQuery = useAdminCounts()

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
          return { day: day.slice(5), registrations: count || 0 }
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
          return { name: labels[r] || r, value: count || 0 }
        }),
      )
      return roleData
    },
    staleTime: 60 * 1000,
  })

  const { data: topShops = [] } = useQuery({
    queryKey: ['admin-top-shops'],
    queryFn: async () => {
      const { data: reservations } = await supabase.from('reservations').select('shop_id')
      const { data: shops } = await supabase.from('shops').select('id, name')
      const nameMap = new Map(shops?.map((s) => [s.id, s.name]) || [])
      const counts = new Map<string, number>()
      reservations?.forEach((r) => counts.set(r.shop_id, (counts.get(r.shop_id) || 0) + 1))
      return Array.from(counts.entries())
        .map(([id, c]) => ({ name: nameMap.get(id) || 'Desconocido', reservations: c }))
        .sort((a, b) => b.reservations - a.reservations)
        .slice(0, 5)
    },
    staleTime: 60 * 1000,
  })

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
    loading: countsQuery.isLoading,
    summary,
    userStats,
    roleDistribution,
    topShops,
    growth,
  }
}
