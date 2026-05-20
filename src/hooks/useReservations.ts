// src/hooks/useReservations.ts

'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import {
  ReservationWithDetails,
  CreateReservationResult,
  ReservationActionResult,
} from '@/types/reservation'

export function useReservations() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar reservas cuando hay un usuario logueado
  useEffect(() => {
    if (user) {
      loadReservations()
    } else {
      setReservations([])
      setLoading(false)
    }
  }, [user])

  /**
   * Carga todas las reservas del usuario actual
   */
  const loadReservations = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          pack:packs (
            id,
            title,
            description,
            price_cents,
            image_url
          ),
          shop:shops (
            id,
            name,
            address,
            phone,
            latitude,
            longitude,
            city
          ),
          user:user_profiles (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReservations(data || [])
    } catch (err: any) {
      console.error('Error loading reservations:', err)
      setError(err.message || 'Error al cargar reservas')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Crea una reserva usando la función RPC atómica
   * @param packId - ID del pack a reservar
   * @param quantity - Cantidad de packs (default: 1)
   * @param paymentMethod - Método de pago ('demo' por ahora)
   */
  const createReservation = async (
    packId: string,
    quantity: number = 1,
    paymentMethod: string = 'demo'
  ): Promise<CreateReservationResult> => {
    if (!user) {
      throw new Error('Debes iniciar sesión para reservar')
    }

    try {
      // ✅ USAR RPC ATÓMICA EN LUGAR DE INSERT DIRECTO
      const { data, error } = await supabase.rpc('create_reservation_atomic', {
        p_pack_id: packId,
        p_quantity: quantity,
        p_payment_method: paymentMethod,
      })

      if (error) throw error

      const result = data as CreateReservationResult

      if (!result.success) {
        throw new Error(result.error || 'Error al crear reserva')
      }

      // Recargar lista de reservas
      await loadReservations()

      return result
    } catch (err: any) {
      console.error('Error creating reservation:', err)
      throw err
    }
  }

  /**
   * Cancela una reserva usando la función RPC que reintegra stock
   * @param reservationId - ID de la reserva a cancelar
   * @param reason - Motivo de la cancelación (opcional)
   */
  const cancelReservation = async (
    reservationId: string,
    reason?: string
  ): Promise<ReservationActionResult> => {
    if (!user) {
      throw new Error('Debes iniciar sesión para cancelar')
    }

    try {
      // ✅ USAR RPC QUE REINTEGRA STOCK AUTOMÁTICAMENTE
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservationId,
        p_cancel_reason: reason || null,
      })

      if (error) throw error

      const result = data as ReservationActionResult

      if (!result.success) {
        throw new Error(result.error || 'Error al cancelar reserva')
      }

      // Recargar lista de reservas
      await loadReservations()

      return result
    } catch (err: any) {
      console.error('Error cancelling reservation:', err)
      throw err
    }
  }

  /**
   * Valida el código de recogida (solo para dueños del comercio)
   * @param pickupCode - Código de recogida del usuario
   */
  const validatePickup = async (
    pickupCode: string
  ): Promise<ReservationActionResult> => {
    if (!user) {
      throw new Error('Debes iniciar sesión para validar')
    }

    try {
      const { data, error } = await supabase.rpc('validate_pickup', {
        p_pickup_code: pickupCode,
      })

      if (error) throw error

      const result = data as ReservationActionResult

      if (!result.success) {
        throw new Error(result.error || 'Código inválido o no se puede validar')
      }

      // Recargar reservas si es necesario
      await loadReservations()

      return result
    } catch (err: any) {
      console.error('Error validating pickup:', err)
      throw err
    }
  }

  /**
   * Obtiene todas las reservas de un comercio específico (para el dashboard del dueño)
   * @param shopId - ID del comercio
   */
  const getBusinessReservations = async (
    shopId: string
  ): Promise<ReservationWithDetails[]> => {
    if (!user) {
      throw new Error('Debes iniciar sesión')
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          pack:packs (
            id,
            title,
            description,
            price_cents,
            image_url
          ),
          user:user_profiles (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err: any) {
      console.error('Error getting business reservations:', err)
      throw err
    }
  }

  /**
   * Obtiene una reserva específica por ID
   */
  const getReservationById = async (
    reservationId: string
  ): Promise<ReservationWithDetails | null> => {
    if (!user) {
      throw new Error('Debes iniciar sesión')
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          pack:packs (
            id,
            title,
            description,
            price_cents,
            image_url
          ),
          shop:shops (
            id,
            name,
            address,
            phone,
            latitude,
            longitude,
            city
          ),
          user:user_profiles (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('id', reservationId)
        .maybeSingle()

      if (error) throw error

      return data
    } catch (err: any) {
      console.error('Error getting reservation by id:', err)
      throw err
    }
  }

  return {
    // Estado
    reservations,
    loading,
    error,

    // Acciones
    loadReservations,
    createReservation,
    cancelReservation,
    validatePickup,
    getBusinessReservations,
    getReservationById,
  }
}