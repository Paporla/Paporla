'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

// ============================================
// Tipos
// ============================================

export interface ShopInfo {
  id: string
  name: string
  verified: boolean
  logo_url: string | null
}

export interface AnalyticsSummary {
  totalRevenue: number
  totalReservations: number
  completedReservations: number
  cancelledReservations: number
  noShows: number
  avgRating: number | null
  activePacks: number
  totalPacksCreated: number
}

export interface TrendPoint {
  date: string
  value: number
}

export interface PeakHour {
  hour: string
  count: number
}

export interface TopPack {
  id: string
  title: string
  totalSold: number
  revenue: number
  cancellationRate: number
}

export interface CancellationData {
  completed: number
  cancelled: number
  noShow: number
  expired: number
}

export interface WeeklyComparison {
  currentWeek: { reservations: number; revenue: number }
  lastWeek: { reservations: number; revenue: number }
  reservationChange: number
  revenueChange: number
}

interface AnalyticsReservation {
  id: string
  status: string
  total_price_cents: number | null
  created_at: string
  pickup_start_time: string | null
  pack_id: string
  pack: { title: string } | null
}

interface AnalyticsPack {
  id: string
  title: string
  is_active: boolean
  remaining_stock: number
  price_cents: number
}

// ============================================
// Helpers
// ============================================

function computeAnalytics(reservations: AnalyticsReservation[], packs: AnalyticsPack[], _shopId: string) {
  const completed = reservations.filter((r) => r.status === 'picked_up')
  const cancelled = reservations.filter((r) => r.status === 'cancelled')
  const noShows = reservations.filter((r) => r.status === 'no_show' || r.status === 'expired')
  const totalRevenue = completed.reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0)

  const activePacks = packs.filter((p) => p.is_active && p.remaining_stock > 0).length

  const summary: AnalyticsSummary = {
    totalRevenue,
    totalReservations: reservations.length,
    completedReservations: completed.length,
    cancelledReservations: cancelled.length,
    noShows: noShows.length,
    avgRating: null,
    activePacks,
    totalPacksCreated: packs.length,
  }

  // Tendencias (ultimos 7 dias)
  const reservationTrend: TrendPoint[] = []
  const revenueTrend: TrendPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayReservations = reservations.filter((r) => r.created_at?.startsWith(dateStr))
    reservationTrend.push({ date: dateStr.slice(5), value: dayReservations.length })
    const dayRevenue = dayReservations
      .filter((r) => r.status === 'picked_up')
      .reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0)
    revenueTrend.push({ date: dateStr.slice(5), value: dayRevenue / 100 })
  }

  // Horarios pico
  const hourCounts: Record<string, number> = {}
  reservations.forEach((r) => {
    if (r.pickup_start_time) {
      const hour = r.pickup_start_time.slice(0, 5)
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }
  })
  const peakHours: PeakHour[] = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([hour, count]) => ({ hour, count }))

  // Top packs
  const packSales: Record<string, { sold: number; revenue: number; cancelled: number; title: string }> = {}
  reservations.forEach((r) => {
    const packId = r.pack_id
    if (!packSales[packId]) {
      packSales[packId] = { sold: 0, revenue: 0, cancelled: 0, title: r.pack?.title ?? 'Pack' }
    }
    if (r.status === 'picked_up') {
      packSales[packId].sold++
      packSales[packId].revenue += (r.total_price_cents ?? 0) / 100
    }
    if (r.status === 'cancelled') {
      packSales[packId].cancelled++
    }
  })
  const topPacks: TopPack[] = Object.entries(packSales)
    .map(([id, data]) => ({
      id,
      title: data.title,
      totalSold: data.sold,
      revenue: data.revenue,
      cancellationRate:
        data.sold + data.cancelled > 0 ? Math.round((data.cancelled / (data.sold + data.cancelled)) * 100) : 0,
    }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 10)

  // Tasa de cancelacion
  const cancellationRate: CancellationData = {
    completed: completed.length,
    cancelled: cancelled.length,
    noShow: noShows.length,
    expired: reservations.filter((r) => r.status === 'expired').length,
  }

  // Comparativa semanal
  const now = new Date()
  const startThisWeek = new Date(now)
  startThisWeek.setDate(now.getDate() - now.getDay())
  startThisWeek.setHours(0, 0, 0, 0)
  const startLastWeek = new Date(startThisWeek)
  startLastWeek.setDate(startLastWeek.getDate() - 7)
  const endLastWeek = new Date(startThisWeek)

  const thisWeek = reservations.filter((r) => new Date(r.created_at) >= startThisWeek)
  const lastWeek = reservations.filter((r) => {
    const d = new Date(r.created_at)
    return d >= startLastWeek && d < endLastWeek
  })

  const thisWeekRev = thisWeek
    .filter((r) => r.status === 'picked_up')
    .reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0)
  const lastWeekRev = lastWeek
    .filter((r) => r.status === 'picked_up')
    .reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0)

  const weeklyComparison: WeeklyComparison = {
    currentWeek: { reservations: thisWeek.length, revenue: thisWeekRev / 100 },
    lastWeek: { reservations: lastWeek.length, revenue: lastWeekRev / 100 },
    reservationChange:
      lastWeek.length > 0
        ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
        : thisWeek.length > 0
          ? 100
          : 0,
    revenueChange:
      lastWeekRev > 0 ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100) : thisWeekRev > 0 ? 100 : 0,
  }

  return {
    summary,
    revenueTrend,
    reservationTrend,
    peakHours,
    topPacks,
    cancellationRate,
    weeklyComparison,
  }
}

// ============================================
// Hook
// ============================================

export function useBusinessAnalytics() {
  const { data: shop, isLoading: shopLoading } = useBusinessShop()

  const packsResult = useQuery({
    queryKey: ['business-analytics-packs', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('packs')
        .select('id, title, is_active, remaining_stock, price_cents')
        .eq('shop_id', shop!.id)
      return (data ?? []) as AnalyticsPack[]
    },
    enabled: !!shop,
    staleTime: 60 * 1000,
  })

  const reservationsResult = useQuery({
    queryKey: ['business-analytics-reservations', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('reservations')
        .select('*, pack:packs(title)')
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: true })
      return (data ?? []) as AnalyticsReservation[]
    },
    enabled: !!shop,
    staleTime: 60 * 1000,
  })

  const loading = shopLoading || packsResult.isLoading || reservationsResult.isLoading
  const packs = packsResult.data ?? []
  const rawReservations = reservationsResult.data ?? []

  const computed =
    rawReservations.length > 0
      ? computeAnalytics(rawReservations, packs, shop?.id ?? '')
      : {
          summary: {
            totalRevenue: 0,
            totalReservations: 0,
            completedReservations: 0,
            cancelledReservations: 0,
            noShows: 0,
            avgRating: null,
            activePacks: 0,
            totalPacksCreated: 0,
          },
          revenueTrend: [] as TrendPoint[],
          reservationTrend: [] as TrendPoint[],
          peakHours: [] as PeakHour[],
          topPacks: [] as TopPack[],
          cancellationRate: { completed: 0, cancelled: 0, noShow: 0, expired: 0 },
          weeklyComparison: {
            currentWeek: { reservations: 0, revenue: 0 },
            lastWeek: { reservations: 0, revenue: 0 },
            reservationChange: 0,
            revenueChange: 0,
          },
        }

  return {
    loading,
    shop: shop as ShopInfo | null,
    ...computed,
  }
}
