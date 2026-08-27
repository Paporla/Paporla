'use client'

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'
import type { ReservationItem } from '@/components/business/reservations/useBusinessReservations'
import { translateDbError } from '@/lib/utils/db-errors'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

/**
 * Panel de inicio del comercio, sobre las RPCs canónicas (mismo patrón que
 * el módulo de reservas, Fase 4): ningún cliente tiene SELECT sobre
 * `packs`/`reservations` (0012 lo revocó), así que todo el dato entra por
 * `list_my_packs` (0014:419) y `list_shop_reservations` (0014:333), que
 * validan internamente que el llamador es dueño del comercio (o admin).
 *
 * Simplificación deliberada del piloto: pedimos hasta 100 filas por RPC (el
 * máximo que admiten) y calculamos las estadísticas EN EL CLIENTE sobre esa
 * lista. Con el volumen del piloto es el cuadro completo; si el volumen lo
 * exige, la RPC de agregados de la Fase 5 sustituye esta lógica.
 */

/** Zona horaria de referencia del piloto: solo existe el mercado Chile. */
const MARKET_TIMEZONE = 'America/Santiago'

/** Fila de `list_my_packs` (0014:419) con los campos que usa este panel. */
export interface DashboardPack {
  id: string
  title: string
  status: string
  price_minor: number
  currency_code: string
  total_stock: number
  remaining_stock: number
}

type ListedPack = {
  pack_id: string
  title: string
  status: string
  price_minor: number
  currency_code: string | null
  total_stock: number
  remaining_stock: number
}

export interface DashboardStats {
  totalPacks: number
  activePacks: number
  todayReservations: number
  totalReservations: number
  pendingReservations: number
  /** Importe en la unidad menor de la moneda (piloto CLP: pesos). */
  totalRevenue: number
  /** Crecimiento de reservas creadas: últimos 7 días vs los 7 anteriores. */
  weekGrowth: number
}

/** Últimos `count` días calendario (la tz del mercado), contando hacia atrás
 *  desde `todayKey`, desplazados `offset` días. Devuelve claves YYYY-MM-DD. */
function dayKeysBack(todayKey: string, count: number, offset: number): Set<string> {
  const base = new Date(`${todayKey}T00:00:00Z`).getTime()
  const keys = new Set<string>()
  for (let i = offset; i < offset + count; i++) {
    keys.add(new Date(base - i * 86400000).toISOString().slice(0, 10))
  }
  return keys
}

export function useBusinessDashboard() {
  const { data: shop, isLoading: shopLoading } = useBusinessShop()

  const [packsResult, reservationsResult] = useQueries({
    queries: [
      {
        queryKey: ['business-packs-dashboard', shop?.id],
        queryFn: async () => {
          const supabase = supabaseBrowser()
          const { data, error: rpcError } = await supabase.rpc('list_my_packs', {
            p_before_created_at: null,
            p_before_pack_id: null,
            p_limit: 100,
          })
          if (rpcError) throw rpcError
          const rows = (data ?? []) as ListedPack[]
          // Los archivados no cuentan (coherente con /business/packs, que
          // tampoco los muestra: para el comercio están "eliminados").
          return rows
            .filter((p) => p.status !== 'archived')
            .map((p): DashboardPack => ({
              id: p.pack_id,
              title: p.title,
              status: p.status,
              price_minor: Number(p.price_minor),
              currency_code: p.currency_code ?? 'CLP',
              total_stock: p.total_stock,
              remaining_stock: p.remaining_stock,
            }))
        },
        enabled: !!shop,
        staleTime: 30 * 1000,
      },
      {
        // Misma clave Y mismos parámetros que useBusinessReservations
        // (F4.1): si el comercio estuvo en esa página hace menos de 15 s,
        // el panel reutiliza la caché sin volver a preguntar.
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
        staleTime: 15 * 1000,
      },
    ],
  })

  const queryError = packsResult.error ?? reservationsResult.error ?? null
  const [lastQueryError, setLastQueryError] = useState<unknown>(null)
  // El fallo de la RPC se duplica en estado DURANTE el render (patrón
  // recomendado por React para duplicar estado, sin efecto): si no, la UI
  // vería ceros sin saber por qué (p. ej. 42501).
  if (queryError !== lastQueryError) {
    setLastQueryError(queryError)
  }
  const error = queryError ? translateDbError(queryError) : null

  const packs = useMemo(() => packsResult.data ?? [], [packsResult.data])
  const reservations = useMemo(() => reservationsResult.data ?? [], [reservationsResult.data])

  const stats = useMemo<DashboardStats>(() => {
    const todayKey = dateKeyInTimezone(new Date().toISOString(), MARKET_TIMEZONE)
    const isDelivered = (r: ReservationItem) => r.status === 'picked_up' || r.status === 'completed'
    const createdKey = (r: ReservationItem) => dateKeyInTimezone(r.created_at, r.timezone || MARKET_TIMEZONE)

    const thisWeekKeys = dayKeysBack(todayKey, 7, 0)
    const lastWeekKeys = dayKeysBack(todayKey, 7, 7)
    const thisWeekCount = reservations.filter((r) => thisWeekKeys.has(createdKey(r))).length
    const lastWeekCount = reservations.filter((r) => lastWeekKeys.has(createdKey(r))).length

    return {
      totalPacks: packs.length,
      // La base garantiza stock > 0 para un pack 'active'
      // (packs_active_stock_check, 0004): el estado basta.
      activePacks: packs.filter((p) => p.status === 'active').length,
      totalReservations: reservations.length,
      // "Pendientes" = a la espera de la confirmación del comercio. El
      // estado 'pending' legacy ya no existe (estado canónico:
      // payment_pending, ver lib/constants/reservations).
      pendingReservations: reservations.filter((r) => r.status === 'payment_pending').length,
      // "Hoy" = reservas CREADAS hoy (tz del mercado): es el número del
      // banner de crecimiento, no el de recogidas de hoy (ese vive en
      // TodayPickups, que usa la ventana de recogida).
      todayReservations: reservations.filter((r) => createdKey(r) === todayKey).length,
      // Ingresos: solo lo efectivamente entregado, en la unidad menor
      // (piloto CLP: pesos, sin decimales).
      totalRevenue: reservations.filter(isDelivered).reduce((sum, r) => sum + (r.total_amount_minor ?? 0), 0),
      weekGrowth:
        lastWeekCount > 0
          ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
          : thisWeekCount > 0
            ? 100
            : 0,
    }
  }, [packs, reservations])

  const recentReservations = useMemo(
    () => [...reservations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [reservations],
  )

  const loading = shopLoading || packsResult.isLoading || reservationsResult.isLoading

  return { shop, packs, recentReservations, loading, error, stats }
}
