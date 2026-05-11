'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { ReservationWithDetails } from '@/types/reservation'

export function useReservations() {
  const { user } = useAuth()
  const supabase = supabaseBrowser();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadReservations()
    }
  }, [user])

  const loadReservations = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        pack:packs (
          title,
          price_cents
        ),
        shop:shops (
          name,
          address,
          phone
        ),
        user:user_profiles (
          name,
          email,
          phone
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setReservations(data || [])
    }
    setLoading(false)
  }

  const createReservation = async (packId: string, shopId: string) => {
    if (!user) throw new Error('Debes iniciar sesión')

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        shop_id: shopId,
        pack_id: packId,
      })
      .select()
      .maybeSingle()  // ← CAMBIADO de .single() a .maybeSingle()

    if (error) throw error

    // El trigger update_pack_stock manejará el stock automáticamente
    // await supabase.rpc('decrement_pack_stock', { pack_id_param: packId })

    await loadReservations()
    return data
  }

  const cancelReservation = async (reservationId: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', reservationId)

    if (error) throw error
    await loadReservations()
  }

  const getBusinessReservations = async (shopId: string) => {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        pack:packs (
          title,
          price_cents
        ),
        user:user_profiles (
          name,
          email,
          phone
        )
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ReservationWithDetails[]
  }

  return {
    reservations,
    loading,
    error,
    loadReservations,
    createReservation,
    cancelReservation,
    getBusinessReservations,
  }
}