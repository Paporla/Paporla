'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { ReservationWithDetails, CreateReservationResult, ReservationActionResult } from '@/types/reservation'

const RESERVATIONS_QUERY_KEY = 'reservations'

async function fetchReservations(userId: string) {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase
    .from('reservations')
    .select(
      '*,pack:packs(id,title,description,price_cents,image_url),shop:shops(id,name,address,phone,latitude,longitude,city),user:user_profiles(id,name,email,phone)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ReservationWithDetails[]
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
    queryFn: () => fetchReservations(user!.id),
    enabled: !!user,
    staleTime: 15 * 1000,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [RESERVATIONS_QUERY_KEY, user?.id] })
  }, [queryClient, user?.id])

  const createReservation = useMutation({
    mutationFn: async ({
      packId,
      quantity = 1,
      paymentMethod = 'demo',
    }: {
      packId: string
      quantity?: number
      paymentMethod?: string
    }) => {
      if (!user) throw new Error('Debes iniciar sesión para reservar')
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('create_reservation_atomic', {
        p_pack_id: packId,
        p_quantity: quantity,
        p_payment_method: paymentMethod,
      })
      if (error) throw error
      const result = data as CreateReservationResult
      if (!result.success) throw new Error(result.error || 'Error al crear reserva')
      return result
    },
    onSuccess: () => invalidate(),
  })

  const cancelReservation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason?: string }) => {
      if (!user) throw new Error('Debes iniciar sesión para cancelar')
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservationId,
        p_cancel_reason: reason || null,
      })
      if (error) throw error
      const result = data as ReservationActionResult
      if (!result.success) throw new Error(result.error || 'Error al cancelar reserva')
      return result
    },
    onSuccess: () => invalidate(),
  })

  const validatePickup = useMutation({
    mutationFn: async (pickupCode: string) => {
      if (!user) throw new Error('Debes iniciar sesión para validar')
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('validate_pickup', { p_pickup_code: pickupCode })
      if (error) throw error
      const result = data as ReservationActionResult
      if (!result.success) throw new Error(result.error || 'Código inválido')
      return result
    },
    onSuccess: () => invalidate(),
  })

  const getBusinessReservations = async (shopId: string): Promise<ReservationWithDetails[]> => {
    if (!user) throw new Error('Debes iniciar sesión')
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('reservations')
      .select('*,pack:packs(id,title,description,price_cents,image_url),user:user_profiles(id,name,email,phone)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  const getReservationById = async (reservationId: string): Promise<ReservationWithDetails | null> => {
    if (!user) throw new Error('Debes iniciar sesión')
    const supabase = supabaseBrowser()
    const { data, error } = await supabase
      .from('reservations')
      .select(
        '*,pack:packs(id,title,description,price_cents,image_url),shop:shops(id,name,address,phone,latitude,longitude,city),user:user_profiles(id,name,email,phone)',
      )
      .eq('id', reservationId)
      .maybeSingle()
    if (error) throw error
    return data
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
