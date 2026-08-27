'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'
import type { ReservationItem } from '@/components/business/reservations/useBusinessReservations'
import { translateDbError } from '@/lib/utils/db-errors'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

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
  /** Importe en la unidad menor de la moneda (piloto CLP: pesos). */
  totalRevenue: number
  totalReservations: number
  completedReservations: number
  cancelledReservations: number
  noShows: number
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
  /** Importe en la unidad menor de la moneda (piloto CLP: pesos). */
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

// ============================================
// Helpers
// ============================================

/**
 * Analítica del comercio, decidida sobre las RPCs canónicas existentes
 * (y NO sobre una RPC nueva de agregados): `list_shop_reservations`
 * (0014:333) y `list_my_packs` (0014:419), las mismas que el panel de
 * reservas (F4.1) y el dashboard (F4.4). Ningún cliente tiene SELECT
 * directo sobre `reservations`/`packs` (0012 lo revocó), y con el volumen
 * del piloto (hasta 100 filas por RPC) basta con calcular en el cliente.
 *
 * Convenciones:
 *  - "Ingresos" y "completadas" = picked_up + completed (el pack ya salió
 *    del local; en el piloto picked_up es el terminal, completed llegará
 *    con el cron de la Fase 7).
 *  - Los días se calculan en la zona horaria del mercado (piloto:
 *    America/Santiago), no en la del navegador: un comercio no quiere que
 *    su "hoy" dependa del fuso de quien mire la web.
 *  - Los importes viajan en la unidad menor de la moneda; la UI la pinta
 *    como está (CLP: pesos, sin decimales).
 */

/** Zona horaria de referencia del piloto: solo existe el mercado Chile. */
const MARKET_TIMEZONE = 'America/Santiago'

/** "Recogida entregada": el pack salió del local y el importe cuenta. */
const isDelivered = (status: string) => status === 'picked_up' || status === 'completed'

/** "HH:MM" (formato 24h) del instante, calculado en la zona horaria dada. */
function hourKeyInTimezone(iso: string | null, timeZone: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** Días del rango de 7 días cuyo inicio (inclusive) es `startKey`, como
 *  claves YYYY-MM-DD (aritmética sobre fechas calendario, sin DST). */
function weekKeysFrom(startKey: string): Set<string> {
  const base = new Date(`${startKey}T00:00:00Z`).getTime()
  return new Set(Array.from({ length: 7 }, (_, i) => new Date(base + i * 86400000).toISOString().slice(0, 10)))
}

// ============================================
// Hook
// ============================================

export function useBusinessAnalytics() {
  const { data: shop, isLoading: shopLoading } = useBusinessShop()

  const [packsResult, reservationsResult] = useQueries({
    queries: [
      {
        queryKey: ['business-analytics-packs', shop?.id],
        queryFn: async () => {
          const supabase = supabaseBrowser()
          const { data, error: rpcError } = await supabase.rpc('list_my_packs', {
            p_before_created_at: null,
            p_before_pack_id: null,
            p_limit: 100,
          })
          if (rpcError) throw rpcError
          const rows = (data ?? []) as { pack_id: string; title: string; status: string }[]
          // Los archivados no cuentan (coherente con el resto del panel).
          return rows.filter((p) => p.status !== 'archived')
        },
        enabled: !!shop,
        staleTime: 60 * 1000,
      },
      {
        // Misma clave y parámetros que useBusinessReservations (F4.1): si
        // el comercio estuvo en esa página hace menos de 15 s, reutiliza
        // la caché en vez de volver a preguntar.
        queryKey: ['business-reservations', shop?.id],
        queryFn: async () => {
          const supabase = supabaseBrowser()
          const { data, error: rpcError } = await supabase.rpc('list_shop_reservations', {
            p_shop_id: shop!.id,
            p_limit: 100,
          })
          if (rpcError) throw rpcError
          return (data ?? []) as ReservationItem[]
        },
        enabled: !!shop,
        staleTime: 60 * 1000,
      },
    ],
  })

  const queryError = packsResult.error ?? reservationsResult.error ?? null
  const error = queryError ? translateDbError(queryError) : null

  const loading = shopLoading || packsResult.isLoading || reservationsResult.isLoading

  const data = useMemo(() => {
    const reservations = reservationsResult.data ?? []
    const packs = packsResult.data ?? []

    const todayKey = dateKeyInTimezone(new Date().toISOString(), MARKET_TIMEZONE)
    const createdKey = (r: ReservationItem) => dateKeyInTimezone(r.created_at, r.timezone || MARKET_TIMEZONE)
    const delivered = reservations.filter((r) => isDelivered(r.status))

    // --- Resumen ---------------------------------------------------------
    const summary: AnalyticsSummary = {
      totalRevenue: delivered.reduce((sum, r) => sum + (r.total_amount_minor ?? 0), 0),
      totalReservations: reservations.length,
      completedReservations: delivered.length,
      cancelledReservations: reservations.filter((r) => r.status === 'cancelled').length,
      noShows: reservations.filter((r) => r.status === 'no_show').length,
      // La base garantiza stock > 0 para un pack 'active'
      // (packs_active_stock_check, 0004): el estado basta.
      activePacks: packs.filter((p) => p.status === 'active').length,
      totalPacksCreated: packs.length,
    }

    // --- Tendencias (últimos 7 días, de más antiguo a hoy) ---------------
    const todayBase = new Date(`${todayKey}T00:00:00Z`).getTime()
    const reservationTrend: TrendPoint[] = []
    const revenueTrend: TrendPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const key = new Date(todayBase - i * 86400000).toISOString().slice(0, 10)
      const dayRows = reservations.filter((r) => createdKey(r) === key)
      reservationTrend.push({ date: key.slice(5), value: dayRows.length })
      revenueTrend.push({
        date: key.slice(5),
        value: dayRows.filter((r) => isDelivered(r.status)).reduce((sum, r) => sum + (r.total_amount_minor ?? 0), 0),
      })
    }

    // --- Horarios pico (ventana de recogida, tz de cada fila) ------------
    const hourCounts: Record<string, number> = {}
    for (const r of reservations) {
      const hour = hourKeyInTimezone(r.pickup_start_at, r.timezone || MARKET_TIMEZONE)
      if (hour) hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
    }
    const peakHours: PeakHour[] = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count || a.hour.localeCompare(b.hour))
      .slice(0, 8)

    // --- Top packs --------------------------------------------------------
    const byPack: Record<string, { title: string; sold: number; revenue: number; cancelled: number }> = {}
    for (const r of reservations) {
      let entry = byPack[r.pack_id]
      if (!entry) {
        entry = { title: r.pack_title, sold: 0, revenue: 0, cancelled: 0 }
        byPack[r.pack_id] = entry
      }
      if (isDelivered(r.status)) {
        entry.sold += 1
        entry.revenue += r.total_amount_minor ?? 0
      }
      if (r.status === 'cancelled') entry.cancelled += 1
    }
    const topPacks: TopPack[] = Object.entries(byPack)
      .map(([id, entry]) => ({
        id,
        title: entry.title,
        totalSold: entry.sold,
        revenue: entry.revenue,
        cancellationRate:
          entry.sold + entry.cancelled > 0 ? Math.round((entry.cancelled / (entry.sold + entry.cancelled)) * 100) : 0,
      }))
      .sort((a, b) => b.totalSold - a.totalSold || b.revenue - a.revenue)
      .slice(0, 10)

    // --- Tasa de éxito -----------------------------------------------------
    const cancellationRate: CancellationData = {
      completed: delivered.length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
      noShow: reservations.filter((r) => r.status === 'no_show').length,
      expired: reservations.filter((r) => r.status === 'expired').length,
    }

    // --- Comparativa semanal (semana civil, empieza el domingo) -----------
    const dayOfWeek = new Date(`${todayKey}T12:00:00Z`).getUTCDay()
    const startThisWeekKey = new Date(new Date(`${todayKey}T00:00:00Z`).getTime() - dayOfWeek * 86400000)
      .toISOString()
      .slice(0, 10)
    const startLastWeekKey = new Date(new Date(`${startThisWeekKey}T00:00:00Z`).getTime() - 7 * 86400000)
      .toISOString()
      .slice(0, 10)
    const thisWeekRows = reservations.filter((r) => weekKeysFrom(startThisWeekKey).has(createdKey(r)))
    const lastWeekRows = reservations.filter((r) => weekKeysFrom(startLastWeekKey).has(createdKey(r)))
    const thisWeekRev = thisWeekRows
      .filter((r) => isDelivered(r.status))
      .reduce((s, r) => s + (r.total_amount_minor ?? 0), 0)
    const lastWeekRev = lastWeekRows
      .filter((r) => isDelivered(r.status))
      .reduce((s, r) => s + (r.total_amount_minor ?? 0), 0)

    const weeklyComparison: WeeklyComparison = {
      currentWeek: { reservations: thisWeekRows.length, revenue: thisWeekRev },
      lastWeek: { reservations: lastWeekRows.length, revenue: lastWeekRev },
      reservationChange:
        lastWeekRows.length > 0
          ? Math.round(((thisWeekRows.length - lastWeekRows.length) / lastWeekRows.length) * 100)
          : thisWeekRows.length > 0
            ? 100
            : 0,
      revenueChange:
        lastWeekRev > 0 ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100) : thisWeekRev > 0 ? 100 : 0,
    }

    return { summary, reservationTrend, revenueTrend, peakHours, topPacks, cancellationRate, weeklyComparison }
  }, [reservationsResult.data, packsResult.data])

  return {
    loading,
    error,
    shop: shop as ShopInfo | null,
    ...data,
  }
}
