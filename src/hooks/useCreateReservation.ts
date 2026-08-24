'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { translateDbError } from '@/lib/utils/db-errors'
import { trackPurchase } from '@/lib/analytics/events'

const RESERVATIONS_QUERY_KEY = 'reservations'

/**
 * Datos canónicos del pack que el llamador ya tiene en pantalla (payload de
 * search_available_packs). Se reciben por parámetro para no hacer otra
 * consulta: el componente que reserva ya los pinta.
 */
export interface PackReservationInfo {
  title: string
  image_path: string | null
  price_minor: number
  currency_code: string
  shopName: string
  shopAddress: string | null
  pickupStartAt: string
  pickupEndAt: string
  timezone: string
}

/** La reserva creada, con todo lo que la UI de confirmación necesita. */
export interface ReservationDetails {
  id: string
  status: string
  paymentStatus: string
  /** Momento en que el hold de 10 minutos expira y el stock se libera. */
  holdExpiresAt: string
  amountMinor: number
  currencyCode: string
  /** true si la base devolvió una reserva ya existente (reintento con la misma clave). */
  idempotentReplay: boolean
  pack: PackReservationInfo
}

interface CreatePaymentReservationResponse {
  success: boolean
  idempotent_replay: boolean
  reservation_id: string
  status: string
  payment_status: string
  hold_expires_at: string
  capture_scheduled_at: string | null
  amount_minor: number
  currency_code: string
}

/**
 * Clave de idempotencia (UUID v4). Prefiere `crypto.randomUUID` y usa
 * getRandomValues como respaldo (algunos entornos de tests no traen randomUUID).
 */
function generateIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto
  if (typeof cryptoObj?.randomUUID === 'function') return cryptoObj.randomUUID()

  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Hook unificado para crear reservas desde el frontend.
 *
 * Habla la RPC real `create_payment_reservation(p_pack_id, p_idempotency_key)`
 * (migración 0009:209, GRANT a authenticated en 0012:48). La
 * `create_reservation_atomic` que llamaba antes NUNCA existió en la base de
 * datos: todos los intentos de reservar fallaban en el servidor.
 *
 * Semántica de idempotencia: mientras el usuario insiste sobre el MISMO pack
 * (fallo de red, doble pulsación, reintento), se reutiliza la misma clave y la
 * base de datos colapsa los intentos en una sola reserva (la respuesta trae
 * `idempotent_replay: true`). Un pack distinto genera clave nueva. Tras el
 * éxito la intención se limpia: un clic posterior será una reserva nueva.
 *
 * Dos cosas que la RPC decide y la UI debe aceptar:
 *  - quantity = 1 siempre (una reserva = un pack); no hay parámetro de cantidad.
 *  - no tiene método de pago y no devuelve código de recogida (ese se emite
 *    más adelante en el flujo, cuando la reserva está lista para recoger).
 *
 * El email de confirmación queda desactivado a propósito: la plantilla actual
 * exige un `pickupCode` que en el flujo canónico todavía no existe al crear la
 * reserva. Se reactiva cuando el código exista de verdad (fase 4), no se envía
 * con un "XXXXXX" inventado.
 */
export function useCreateReservation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = supabaseBrowser()

  const [lastReservation, setLastReservation] = useState<ReservationDetails | null>(null)
  const [error, setError] = useState('')

  /** Intención en curso: el pack y la clave de idempotencia que le corresponde. */
  const intentRef = useRef<{ packId: string; key: string } | null>(null)

  const clearError = useCallback(() => setError(''), [])

  const mutation = useMutation({
    mutationFn: async ({
      packId,
      packInfo,
    }: {
      packId: string
      packInfo: PackReservationInfo
    }): Promise<ReservationDetails> => {
      if (!user) throw new Error('Debes iniciar sesión para reservar')

      const intent = intentRef.current
      const idempotencyKey = intent?.packId === packId ? intent.key : generateIdempotencyKey()
      intentRef.current = { packId, key: idempotencyKey }

      const { data, error: rpcError } = await supabase.rpc('create_payment_reservation', {
        p_pack_id: packId,
        p_idempotency_key: idempotencyKey,
      })

      if (rpcError) throw rpcError

      const payload = data as CreatePaymentReservationResponse | null
      if (!payload?.success || !payload.reservation_id) throw new Error('Error al crear la reserva')

      return {
        id: payload.reservation_id,
        status: payload.status,
        paymentStatus: payload.payment_status,
        holdExpiresAt: payload.hold_expires_at,
        amountMinor: payload.amount_minor,
        currencyCode: payload.currency_code,
        idempotentReplay: payload.idempotent_replay === true,
        pack: packInfo,
      }
    },
    onSuccess: () => {
      setError('')
      // Cierre de intención: la próxima reserva (aunque sea del mismo pack)
      // será una reserva nueva, no un replay.
      intentRef.current = null
      // Invalida "mis reservas" y cualquier dashboard que consuma esa query.
      queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY] })
    },
    onError: (err: unknown) => {
      setError(translateDbError(err, 'No se pudo crear la reserva. Inténtalo de nuevo.'))
    },
  })

  /**
   * Crea la reserva y devuelve los detalles para el modal de confirmación,
   * o `null` si falló (el error queda en `error`, ya traducido al español).
   */
  const createReservation = useCallback(
    async (packId: string, packInfo: PackReservationInfo): Promise<ReservationDetails | null> => {
      setError('')

      let details: ReservationDetails | null = null
      try {
        details = await mutation.mutateAsync({ packId, packInfo })
      } catch {
        // El mensaje ya quedó en `error` vía onError; no se repite aquí.
        return null
      }

      trackPurchase(details.id, packId, packInfo.title, details.amountMinor, details.currencyCode, packInfo.shopName)

      setLastReservation(details)
      return details
    },
    [mutation],
  )

  const clearLastReservation = useCallback(() => setLastReservation(null), [])

  return {
    /** Ejecuta la reserva completa (RPC + analítica + detalles para el modal). */
    createReservation,
    /** Datos de la última reserva exitosa, para el modal de confirmación. */
    lastReservation,
    /** Limpia la última reserva (p. ej. al cerrar el modal). */
    clearLastReservation,
    /** true durante la llamada a la RPC. */
    loading: mutation.isPending,
    /** Mensaje de error traducido si la última reserva falló. */
    error,
    /** Limpia el error manualmente. */
    clearError,
  }
}
