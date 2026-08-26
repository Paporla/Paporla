'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'
import { sortReservationsByPickupTime } from '@/lib/constants/reservations'
import { translateDbError } from '@/lib/utils/db-errors'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

/**
 * Fila canónica de `list_shop_reservations` (migración 0014:333). Son
 * EXACTAMENTE las 12 columnas que la base expone al comercio, ni una más:
 * privacidad (solo el nombre visible del cliente, sin email ni teléfono),
 * sin código de recogida (se emite una sola vez al confirmar, 0031: en la
 * base solo vive su huella sha256) y el importe en la unidad menor de su
 * moneda (CLP: pesos, sin centavos).
 */
export interface ReservationItem {
  reservation_id: string
  pack_id: string
  pack_title: string
  customer_display_name: string
  status: string
  payment_status: string
  total_amount_minor: number
  currency_code: string
  pickup_start_at: string | null
  pickup_end_at: string | null
  timezone: string
  created_at: string
}

/** Estadísticas del panel; todas las cifras nacen de la misma lista de filas. */
export interface BusinessReservationStats {
  total: number
  pending: number
  confirmed: number
  ready: number
  completed: number
  noShow: number
  cancelled: number
  expired: number
  revenue: number
  todayCount: number
}

/**
 * Resultado de confirmar una reserva (piloto sin pagos, 0031).
 * `code` es el código de recogida del cliente, que se muestra UNA sola vez
 * (la base solo guarda su huella sha256); null = la reserva ya estaba
 * confirmada (repetición), y en ese caso `note` lo explica.
 */
export interface ConfirmResult {
  code: string | null
  packTitle: string
  note: string | null
}

/**
 * Zona horaria de referencia del piloto: solo existe el mercado Chile.
 * (Cada fila además trae su propia `timezone`, que usamos para mostrar la
 * ventana de recogida; para "hoy" necesitamos UNA sola referencia.)
 */
const MARKET_TIMEZONE = 'America/Santiago'

/** Normaliza para búsqueda: minúsculas y sin diacríticos ("María" → "maria"). */
const normalizeTerm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * Reservas del panel del comercio.
 *
 * Los datos vienen de la RPC canónica `list_shop_reservations` (0014:333),
 * NO de lectura directa de la tabla: ningún cliente tiene SELECT sobre
 * `reservations` (RLS respondería 42501), y la RPC ya valida internamente
 * que el llamador es dueño del comercio (o admin) y limita lo que ve.
 *
 * Simplificaciones deliberadas del piloto:
 *  - Pedimos hasta 100 reservas (el máximo que admite la RPC) y filtramos
 *    por estado y búsqueda EN EL CLIENTE. Así la barra de estadísticas
 *    siempre ve el cuadro completo; la paginación con cursor
 *    (p_before_pickup_start_at) llega cuando el volumen la exija.
 *  - Las acciones disponibles son confirmar (piloto sin pagos, 0031) y
 *    cancelar, cada una por su RPC canónica: `confirm_shop_reservation` y
 *    `cancel_reservation` con `p_reason` (el nombre del parámetro importa:
 *    la RPC no acepta `p_cancel_reason`).
 */
export function useBusinessReservations() {
  const { data: shop } = useBusinessShop()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null)

  const {
    data: reservations = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
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
  })

  // Sin esto el fallo de la RPC se tragaría en silencio (queryError viviría
  // solo dentro de react-query) y el comercio vería una lista vacía sin
  // saber por qué (p. ej. 42501). TanStack v5 no trae onError en useQuery,
  // así que se ajusta el estado DURANTE el render (patrón recomendado por
  // React para duplicar estado, sin efecto y sin cascada de renders).
  const [lastQueryError, setLastQueryError] = useState<Error | null>(null)
  if (queryError !== lastQueryError) {
    setLastQueryError(queryError)
    setError(queryError ? translateDbError(queryError) : '')
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business-reservations'] })

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const supabase = supabaseBrowser()
      const { data, error: rpcError } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservationId,
        p_reason: 'Cancelada por el comercio',
      })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Error al cancelar la reserva')
    },
    onSuccess: () => {
      setSuccess('Reserva cancelada y stock reintegrado')
      invalidate()
    },
    onError: (err) => {
      setError(translateDbError(err))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const supabase = supabaseBrowser()
      const { data, error: rpcError } = await supabase.rpc('confirm_shop_reservation', {
        p_reservation_id: reservationId,
      })
      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Error al confirmar la reserva')
      return data as { idempotent_replay: boolean; pickup_code: string | null; note?: string | null }
    },
    onSuccess: () => {
      invalidate()
    },
    onError: (err) => {
      setError(translateDbError(err))
    },
  })

  // Filtro por estado y búsqueda EN EL CLIENTE (ver nota del piloto arriba):
  // la lista cruda llega completa para que las estadísticas no se queden cortas.
  const filteredReservations = useMemo(() => {
    let filtered = reservations
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }
    if (searchTerm.trim()) {
      // Insensible a acentos: buscar "maria" debe encontrar "María".
      const term = normalizeTerm(searchTerm)
      filtered = filtered.filter(
        (r) => normalizeTerm(r.customer_display_name).includes(term) || normalizeTerm(r.pack_title).includes(term),
      )
    }
    // Activas primero (recogida más cercana al frente), historial después.
    return sortReservationsByPickupTime(filtered)
  }, [reservations, statusFilter, searchTerm])

  // Las estadísticas se calculan SIEMPRE sobre la lista completa (sin el
  // filtro de estado ni la búsqueda), para que la barra no mienta.
  const stats = useMemo<BusinessReservationStats>(() => {
    const todayKey = dateKeyInTimezone(new Date().toISOString(), MARKET_TIMEZONE)
    return {
      total: reservations.length,
      pending: reservations.filter((r) => r.status === 'payment_pending').length,
      confirmed: reservations.filter((r) => r.status === 'confirmed').length,
      ready: reservations.filter((r) => r.status === 'ready_pickup').length,
      completed: reservations.filter((r) => r.status === 'picked_up' || r.status === 'completed').length,
      noShow: reservations.filter((r) => r.status === 'no_show').length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
      expired: reservations.filter((r) => r.status === 'expired').length,
      // Ingresos: solo lo efectivamente entregado (recogido o completado),
      // no lo que todavía está a la espera de confirmación.
      revenue: reservations
        .filter((r) => r.status === 'picked_up' || r.status === 'completed')
        .reduce((sum, r) => sum + (r.total_amount_minor ?? 0), 0),
      // "Hoy": clientes cuya recogida cae HOY en la zona horaria del mercado
      // y cuya reserva sigue en pie para pasar por el local.
      todayCount: reservations.filter(
        (r) =>
          (r.status === 'payment_pending' || r.status === 'confirmed' || r.status === 'ready_pickup') &&
          dateKeyInTimezone(r.pickup_start_at, r.timezone || MARKET_TIMEZONE) === todayKey,
      ).length,
    }
  }, [reservations])

  /**
   * Cancela una reserva. Éxitos y errores los gestiona la mutation (toast +
   * invalidación + traducción del error a español); aquí solo se controla el
   * botón.
   */
  const cancelReservation = async (reservationId: string) => {
    setUpdating(reservationId)
    setError('')
    setSuccess('')
    try {
      await cancelMutation.mutateAsync(reservationId)
    } catch {
      // El onError de la mutation ya dejó el mensaje traducido en `error`.
    } finally {
      setUpdating(null)
    }
  }

  /**
   * Confirma una reserva (piloto sin pagos, 0031): la pasa a ready_pickup +
   * paid y genera el código de recogida del cliente, que la RPC devuelve UNA
   * sola vez (en la base solo se guarda su huella sha256). El resultado queda
   * en `confirmResult` para que la página muestre el código en su modal.
   */
  const confirmReservation = async (reservationId: string) => {
    setUpdating(reservationId)
    setError('')
    setSuccess('')
    setConfirmResult(null)
    try {
      const data = await confirmMutation.mutateAsync(reservationId)
      const row = reservations.find((r) => r.reservation_id === reservationId)
      const packTitle = row?.pack_title ?? 'Pack'
      if (data.idempotent_replay) {
        setConfirmResult({ code: null, packTitle, note: data.note ?? 'La reserva ya estaba confirmada.' })
      } else {
        setConfirmResult({ code: data.pickup_code ?? null, packTitle, note: null })
        setSuccess('Reserva confirmada. Comparte el código de recogida con tu cliente.')
      }
    } catch {
      // El onError de la mutation ya dejó el mensaje traducido en `error`.
    } finally {
      setUpdating(null)
    }
  }

  return {
    shopId: shop?.id ?? null,
    loading,
    error,
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    reservations: filteredReservations,
    stats,
    updating,
    cancelReservation,
    confirmReservation,
    confirmResult,
    setConfirmResult,
    reload: invalidate,
  }
}
