'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// ============================================
// Tipos
// ============================================

export interface ShopInfo {
  id: string; name: string; verified: boolean; logo_url: string | null
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
  reservationChange: number // porcentaje
  revenueChange: number // porcentaje
}

// ============================================
// Hook
// ============================================

export function useBusinessAnalytics() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalRevenue: 0, totalReservations: 0, completedReservations: 0,
    cancelledReservations: 0, noShows: 0, avgRating: null,
    activePacks: 0, totalPacksCreated: 0,
  })
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([])
  const [reservationTrend, setReservationTrend] = useState<TrendPoint[]>([])
  const [peakHours, setPeakHours] = useState<PeakHour[]>([])
  const [topPacks, setTopPacks] = useState<TopPack[]>([])
  const [cancellationRate, setCancellationRate] = useState<CancellationData>({
    completed: 0, cancelled: 0, noShow: 0, expired: 0,
  })
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison>({
    currentWeek: { reservations: 0, revenue: 0 },
    lastWeek: { reservations: 0, revenue: 0 },
    reservationChange: 0, revenueChange: 0,
  })

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Obtener comercio
    const { data: shopData } = await supabase
      .from('shops').select('id, name, verified, logo_url')
      .eq('owner_id', user.id).maybeSingle()

    if (!shopData) { setLoading(false); return }
    setShop(shopData)
    const shopId = shopData.id

    // 2. Obtener todas las reservas del comercio
    const { data: reservations } = await supabase
      .from('reservations')
      .select('*, pack:packs(title)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true })

    const rawReservations = (reservations || []) as any[]

    // 3. Obtener packs
    const { data: packs } = await supabase
      .from('packs').select('id, title, is_active, remaining_stock, price_cents')
      .eq('shop_id', shopId)

    const packsList = packs || []
    const activePacks = packsList.filter(p => p.is_active && p.remaining_stock > 0).length

    // 4. Calcular resumen
    const completed = rawReservations.filter((r: any) => r.status === 'picked_up')
    const cancelled = rawReservations.filter((r: any) => r.status === 'cancelled')
    const noShows = rawReservations.filter((r: any) => r.status === 'no_show' || r.status === 'expired')
    const totalRevenue = completed.reduce((sum: number, r: any) => sum + (r.total_price_cents || 0), 0)

    setSummary({
      totalRevenue,
      totalReservations: rawReservations.length,
      completedReservations: completed.length,
      cancelledReservations: cancelled.length,
      noShows: noShows.length,
      avgRating: null, // Simplificado
      activePacks,
      totalPacksCreated: packsList.length,
    })

    // 5. Calcular tendencias (ultimos 7 dias)
    const last7Days: TrendPoint[] = []
    const rev7Days: TrendPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayReservations = rawReservations.filter((r: any) =>
        r.created_at?.startsWith(dateStr)
      )
      last7Days.push({ date: dateStr.slice(5), value: dayReservations.length })
      const dayRevenue = dayReservations
        .filter((r: any) => r.status === 'picked_up')
        .reduce((sum: number, r: any) => sum + (r.total_price_cents || 0), 0)
      rev7Days.push({ date: dateStr.slice(5), value: dayRevenue / 100 })
    }
    setReservationTrend(last7Days)
    setRevenueTrend(rev7Days)

    // 6. Horarios pico
    const hourCounts: Record<string, number> = {}
    rawReservations.forEach((r: any) => {
      if (r.pickup_start_time) {
        const hour = r.pickup_start_time.slice(0, 5)
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    })
    const peak = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([hour, count]) => ({ hour, count }))
    setPeakHours(peak)

    // 7. Top packs
    const packSales: Record<string, { sold: number; revenue: number; cancelled: number; title: string }> = {}
    rawReservations.forEach((r: any) => {
      const packId = r.pack_id
      if (!packSales[packId]) {
        packSales[packId] = {
          sold: 0, revenue: 0, cancelled: 0,
          title: r.pack?.title || 'Pack',
        }
      }
      if (r.status === 'picked_up') {
        packSales[packId].sold++
        packSales[packId].revenue += (r.total_price_cents || 0) / 100
      }
      if (r.status === 'cancelled') {
        packSales[packId].cancelled++
      }
    })
    const top = Object.entries(packSales)
      .map(([id, data]) => ({
        id,
        title: data.title,
        totalSold: data.sold,
        revenue: data.revenue,
        cancellationRate: data.sold + data.cancelled > 0
          ? Math.round((data.cancelled / (data.sold + data.cancelled)) * 100)
          : 0,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10)
    setTopPacks(top)

    // 8. Tasa de cancelacion
    setCancellationRate({
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShows.length,
      expired: rawReservations.filter((r: any) => r.status === 'expired').length,
    })

    // 9. Comparativa semanal
    const now = new Date()
    const startThisWeek = new Date(now)
    startThisWeek.setDate(now.getDate() - now.getDay())
    startThisWeek.setHours(0, 0, 0, 0)
    const startLastWeek = new Date(startThisWeek)
    startLastWeek.setDate(startLastWeek.getDate() - 7)
    const endLastWeek = new Date(startThisWeek)

    const thisWeek = rawReservations.filter((r: any) => {
      const d = new Date(r.created_at)
      return d >= startThisWeek
    })
    const lastWeek = rawReservations.filter((r: any) => {
      const d = new Date(r.created_at)
      return d >= startLastWeek && d < endLastWeek
    })

    const thisWeekRev = thisWeek
      .filter((r: any) => r.status === 'picked_up')
      .reduce((sum: number, r: any) => sum + (r.total_price_cents || 0), 0)
    const lastWeekRev = lastWeek
      .filter((r: any) => r.status === 'picked_up')
      .reduce((sum: number, r: any) => sum + (r.total_price_cents || 0), 0)

    setWeeklyComparison({
      currentWeek: { reservations: thisWeek.length, revenue: thisWeekRev / 100 },
      lastWeek: { reservations: lastWeek.length, revenue: lastWeekRev / 100 },
      reservationChange: lastWeek.length > 0
        ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
        : thisWeek.length > 0 ? 100 : 0,
      revenueChange: lastWeekRev > 0
        ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100)
        : thisWeekRev > 0 ? 100 : 0,
    })

    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadData() }, [loadData])

  return {
    loading, shop, summary, revenueTrend, reservationTrend,
    peakHours, topPacks, cancellationRate, weeklyComparison,
  }
}
