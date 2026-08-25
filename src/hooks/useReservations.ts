'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { apiFetch } from '@/lib/utils/api-client'
import type { MyReservation } from '@/types/reservation'

const RESERVATIONS_QUERY_KEY = 'reservations'

async function fetchReservations(): Promise<MyReservation[]> {
  const data = await apiFetch<{ success: boolean; reservations: MyReservation[] }>('/api/reservations')
  return data.reservations
}

/**
 * Reservas del usuario (list_my_reservations vía GET /api/reservations).
 *
 * Solo listado + cancelación. La creación NO pasa por aquí:
 * useCreateReservation llama directo al RPC create_payment_reservation
 * (fase 3.1). La validación de recogida tampoco: es acción del comercio
 * (fase 4).
 */
export function useReservations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: reservations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [RESERVATIONS_QUERY_KEY, user?.id],
    queryFn: fetchReservations,
    enabled: !!user,
    staleTime: 15 * 1000,
  })

  // Prefijo 'reservations' (sin userId): así también invalida si el usuario
  // cambia entre sesiones, y es el mismo prefijo que usa useCreateReservation
  // al terminar de crear una reserva.
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY] })
  }, [queryClient])

  const cancelReservation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      return apiFetch<{ success: boolean; message?: string }>('/api/reservations', {
        method: 'PUT',
        body: JSON.stringify({ id: reservationId, cancel_reason: reason }),
      })
    },
    onSuccess: () => invalidate(),
  })

  return {
    reservations,
    loading: isLoading,
    error: error?.message ?? null,
    cancelReservation: cancelReservation.mutateAsync,
    cancelling: cancelReservation.isPending,
    invalidate,
  }
}
