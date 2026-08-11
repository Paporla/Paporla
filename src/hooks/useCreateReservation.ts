'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { formatPrice } from '@/lib/utils/formatPrice'
import { trackPurchase } from '@/lib/analytics/events'
import { logger } from '@/lib/logger'

const RESERVATIONS_QUERY_KEY = 'reservations'

export interface ReservationResult {
  reservation_id: string
  pickup_code: string
}

export interface ReservationDetails {
  id: string
  pickup_code: string
  pack: { title: string; image_url: string | null }
  shop: { name: string; address: string | null; phone: string | null }
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
}

interface CreateReservationParams {
  packId: string
  quantity?: number
  paymentMethod?: 'cash' | 'demo'
}

/**
 * Hook unificado para crear reservas — usado tanto en el listado
 * de packs como en la página de detalle. Encapsula la llamada RPC,
 * el envío del email de confirmación, y la invalidación de caché.
 *
 * Flujo:
 * 1. createReservation() → llama RPC create_reservation_atomic
 * 2. On success → envía email de confirmación (best-effort)
 * 3. Devuelve los detalles para mostrar en el modal de confirmación
 * 4. Invalida la query de reservas para refrescar el dashboard
 */
export function useCreateReservation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = supabaseBrowser()

  const [lastReservation, setLastReservation] = useState<ReservationDetails | null>(null)
  const [error, setError] = useState('')

  const clearError = useCallback(() => setError(''), [])

  const mutation = useMutation({
    mutationFn: async ({
      packId,
      quantity = 1,
      paymentMethod = 'cash',
    }: CreateReservationParams): Promise<ReservationResult> => {
      if (!user) throw new Error('Debes iniciar sesión para reservar')

      const { data, error: rpcError } = await supabase.rpc('create_reservation_atomic', {
        p_pack_id: packId,
        p_quantity: quantity,
        p_payment_method: paymentMethod,
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Error al crear la reserva')

      return {
        reservation_id: data.reservation_id as string,
        pickup_code: data.pickup_code as string,
      }
    },
    onSuccess: () => {
      // Invalidar la query de reservas para que el dashboard se actualice
      queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  /**
   * Crea la reserva y, si tiene éxito, construye los detalles
   * para mostrar en el modal de confirmación.
   *
   * Recibe los datos del pack/shop para no tener que hacer
   * otra query — el componente que llama ya tiene estos datos.
   */
  const createReservation = useCallback(
    async (
      params: CreateReservationParams,
      packDetails: {
        title: string
        image_url: string | null
        price_cents: number
        shop: { name: string; address: string | null; phone: string | null }
        pickup_date: string | null
        pickup_start_time: string | null
        pickup_end_time: string | null
      },
    ): Promise<ReservationDetails | null> => {
      setError('')

      try {
        const result = await mutation.mutateAsync(params)

        // Enviar email de confirmación (best-effort, no bloquea)
        if (user?.email) {
          try {
            const { apiFetch } = await import('@/lib/utils/api-client')
            apiFetch('/api/email', {
              method: 'POST',
              body: JSON.stringify({
                type: 'reservation',
                email: user.email,
                data: {
                  userName: user.name ?? 'Usuario',
                  packTitle: packDetails.title,
                  shopName: packDetails.shop.name,
                  pickupCode: result.pickup_code,
                  price: formatPrice(packDetails.price_cents * params.quantity!),
                },
              }),
            }).catch((emailErr) => logger.error('useCreateReservation sendConfirmationEmail', emailErr))
          } catch {
            // Email es best-effort; no afecta el flujo principal
          }
        }

        const details: ReservationDetails = {
          id: result.reservation_id,
          pickup_code: result.pickup_code,
          pack: { title: packDetails.title, image_url: packDetails.image_url },
          shop: packDetails.shop,
          pickup_date: packDetails.pickup_date,
          pickup_start_time: packDetails.pickup_start_time,
          pickup_end_time: packDetails.pickup_end_time,
        }

        // Trackear conversión en GA4
        trackPurchase(
          result.reservation_id,
          params.packId,
          packDetails.title,
          packDetails.price_cents * (params.quantity ?? 1),
          packDetails.shop.name,
        )

        setLastReservation(details)
        return details
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al procesar la reserva'
        setError(message)
        return null
      }
    },
    [mutation, user],
  )

  const clearLastReservation = useCallback(() => setLastReservation(null), [])

  return {
    /** Ejecuta la reserva completa (RPC + email + detalles) */
    createReservation,
    /** Datos de la última reserva exitosa para el modal de confirmación */
    lastReservation,
    /** Limpia la última reserva (ej: al cerrar el modal) */
    clearLastReservation,
    /** true durante la llamada RPC */
    loading: mutation.isPending,
    /** Mensaje de error si algo falló */
    error,
    /** Limpia el error manualmente */
    clearError,
  }
}
