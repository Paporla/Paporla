'use client'

import { useQueries } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

export interface PackBrief {
  id: string
  title: string
  remaining_stock: number
  is_active: boolean
  price_cents: number
}
export interface ReservationBrief {
  id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: string
  created_at: string
  user: { name: string; email: string }
  pack: { title: string }
}
export interface DashboardStats {
  totalPacks: number
  activePacks: number
  todayReservations: number
  totalReservations: number
  pendingReservations: number
  totalRevenue: number
  weekGrowth: number
}
export interface ShopInfo {
  id: string
  name: string
  verified: boolean
  logo_url: string | null
}

export function useBusinessDashboard() {
  const { data: shop, isLoading: shopLoading } = useBusinessShop()

  const packsQuery = {
    queryKey: ['business-packs', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('packs')
        .select('id, title, remaining_stock, is_active, price_cents')
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as PackBrief[]
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  }

  // Reservas recientes con límite (últimas 2 semanas aprox)
  const recentQuery = {
    queryKey: ['business-reservations-recent', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const { data } = await supabase
        .from('reservations')
        .select(
          'id, user_id, quantity, total_price_cents, status, created_at, pack:packs(title), user:user_profiles(name, email)',
        )
        .eq('shop_id', shop!.id)
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
      return ((data ?? []) as ReservationBrief[]).map((r) => ({
        ...r,
        user: r.user ?? { name: 'Usuario', email: '' },
      }))
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  }

  // Stats agregados con count queries (sin descargar datos)
  const statsQuery = {
    queryKey: ['business-dash-stats', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const today = new Date().toISOString().split('T')[0]
      const [totalRes, todayRes, pendingRes, revenueRes] = await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('shop_id', shop!.id),
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shop!.id)
          .gte('created_at', `${today}T00:00:00`),
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shop!.id)
          .in('status', ['pending', 'confirmed']),
        supabase.from('reservations').select('total_price_cents').eq('shop_id', shop!.id).eq('status', 'picked_up'),
      ])
      return {
        totalReservations: totalRes.count ?? 0,
        todayReservations: todayRes.count ?? 0,
        pendingReservations: pendingRes.count ?? 0,
        totalRevenue: (revenueRes.data ?? []).reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0),
      }
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  }

  const [packsResult, recentResult, statsResult] = useQueries({
    queries: [packsQuery, recentQuery, statsQuery],
  })
  const packs = packsResult.data ?? []
  const rawReservations = recentResult.data ?? []
  const dashStats = statsResult.data ?? {
    totalReservations: 0,
    todayReservations: 0,
    pendingReservations: 0,
    totalRevenue: 0,
  }
  const loading = shopLoading || packsResult.isLoading || recentResult.isLoading || statsResult.isLoading

  const activePacks = packs.filter((p) => p.is_active && p.remaining_stock > 0).length

  // Crecimiento semanal (usa datos de las últimas 2 semanas ya cargadas)
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const thisWeekReservations = rawReservations.filter((r) => {
    const d = new Date(r.created_at)
    return d >= oneWeekAgo && d <= now
  }).length
  const lastWeekReservations = rawReservations.filter((r) => {
    const d = new Date(r.created_at)
    return d >= twoWeeksAgo && d < oneWeekAgo
  }).length

  const weekGrowth =
    lastWeekReservations > 0
      ? Math.round(((thisWeekReservations - lastWeekReservations) / lastWeekReservations) * 100)
      : thisWeekReservations > 0
        ? 100
        : 0

  const error = packsResult.error?.message || recentResult.error?.message || statsResult.error?.message || null

  return {
    shop,
    packs,
    recentReservations: rawReservations.slice(0, 5),
    loading,
    error,
    stats: {
      totalPacks: packs.length,
      activePacks,
      todayReservations: dashStats.todayReservations,
      totalReservations: dashStats.totalReservations,
      pendingReservations: dashStats.pendingReservations,
      totalRevenue: dashStats.totalRevenue,
      weekGrowth,
    },
  }
}
