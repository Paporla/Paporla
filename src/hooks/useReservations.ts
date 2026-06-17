'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import type { ReservationWithDetails } from '@/types/reservation'

const RESERVATIONS_QUERY_KEY = 'reservations'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Error en la solicitud')
  return data as T
}

async function fetchReservations() {
  const data = await apiFetch<{ success: boolean; reservations: ReservationWithDetails[] }>('/api/reservations')
  return data.reservations
}

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

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY, user?.id] })
  }, [queryClient, user?.id])

  const createReservation = useMutation({
    mutationFn: async ({ packId, shopId, quantity = 1 }: { packId: string; shopId: string; quantity?: number }) => {
      if (!user) throw new Error('Debes iniciar sesión para reservar')
      return apiFetch<{ success: boolean; reservation: ReservationWithDetails }>('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, shop_id: shopId, quantity }),
      })
    },
    onSuccess: () => invalidate(),
  })

  const cancelReservation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason?: string }) => {
      if (!user) throw new Error('Debes iniciar sesión para cancelar')
      return apiFetch<{ success: boolean; reservation: ReservationWithDetails }>('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservationId, status: 'cancelled', cancel_reason: reason }),
      })
    },
    onSuccess: () => invalidate(),
  })

  const validatePickup = useMutation({
    mutationFn: async (pickupCode: string) => {
      if (!user) throw new Error('Debes iniciar sesión para validar')
      return apiFetch<{ success: boolean; data: { success: boolean } }>('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '', status: 'validate_pickup', pickup_code: pickupCode }),
      })
    },
    onSuccess: () => invalidate(),
  })

  const getBusinessReservations = async (shopId: string): Promise<ReservationWithDetails[]> => {
    if (!user) throw new Error('Debes iniciar sesión')
    const data = await apiFetch<{ success: boolean; reservations: ReservationWithDetails[] }>(
      `/api/reservations?shopId=${shopId}`,
    )
    return data.reservations
  }

  const getReservationById = async (reservationId: string): Promise<ReservationWithDetails | null> => {
    if (!user) throw new Error('Debes iniciar sesión')
    const data = await apiFetch<{ success: boolean; reservation: ReservationWithDetails | null }>(
      `/api/reservations?id=${reservationId}`,
    )
    return data.reservation
  }

  return {
    reservations,
    loading: isLoading,
    error: error?.message || null,
    createReservation: createReservation.mutateAsync,
    cancelReservation: cancelReservation.mutateAsync,
    validatePickup: validatePickup.mutateAsync,
    getBusinessReservations,
    getReservationById,
    invalidate,
  }
}
