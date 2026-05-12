'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface ReservationItem {
  id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: 'pending' | 'confirmed' | 'ready_pickup' | 'picked_up' | 'completed' | 'cancelled' | 'no_show'
  created_at: string
  pickup_code: string
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  user: { name: string; email: string; phone: string | null }
  pack: { id: string; title: string; price_cents: number }
}

export function useBusinessReservations() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [shopId, setShopId] = useState<string | null>(null)
  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadShopAndReservations()
  }, [user])

  const filteredReservations = useMemo(() => {
    let filtered = [...reservations]
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.pack.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }
    return filtered
  }, [searchTerm, statusFilter, reservations])

  const stats = useMemo(() => ({
    total: reservations.length,
    pending: reservations.filter(r => ['confirmed', 'pending'].includes(r.status)).length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'picked_up').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    noShow: reservations.filter(r => r.status === 'no_show').length,
    totalRevenue: reservations.reduce((sum, r) => sum + (r.total_price_cents || 0), 0),
  }), [reservations])

  const loadShopAndReservations = async () => {
    if (!user) return
    setLoading(true)
    setError('')

    const { data: shopData, error: shopError } = await supabase
      .from('shops').select('id').eq('owner_id', user.id).maybeSingle()

    if (shopError || !shopData) {
      setError(shopError?.message || 'No se encontró tu comercio')
      setLoading(false)
      return
    }

    setShopId(shopData.id)

    const { data: reservationsData, error: reservationsError } = await supabase
      .from('reservations')
      .select(`id,user_id,quantity,total_price_cents,status,created_at,pickup_code,pickup_date,pickup_start_time,pickup_end_time,pack:packs(id,title,price_cents)`)
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      setError(reservationsError.message)
      setLoading(false)
      return
    }

    const enriched = await Promise.all(
      (reservationsData || []).map(async (r: any) => {
        const { data: userData } = await supabase
          .from('user_profiles').select('name, email, phone').eq('id', r.user_id).maybeSingle()
        return { ...r, user: userData || { name: 'Usuario', email: 'N/A', phone: null } }
      })
    )

    setReservations(enriched as unknown as ReservationItem[])
    setLoading(false)
  }

  const updateStatus = async (reservationId: string, newStatus: string) => {
    setUpdating(reservationId)
    setError('')
    setSuccess('')

    const updates: any = { status: newStatus }
    if (['picked_up', 'completed'].includes(newStatus)) updates.picked_up_at = new Date().toISOString()
    if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('reservations').update(updates).eq('id', reservationId)

    if (updateError) {
      setError(updateError.message)
    } else {
      const labels: Record<string, string> = {
        confirmed: 'confirmada', ready_pickup: 'lista para recoger',
        picked_up: 'validada', completed: 'completada',
        cancelled: 'cancelada', no_show: 'no retirada'
      }
      setSuccess(`Reserva ${labels[newStatus] || 'actualizada'} correctamente`)
      await loadShopAndReservations()
    }
    setUpdating(null)
  }

  return {
    shopId, loading, error, success, setError, setSuccess,
    searchTerm, setSearchTerm, statusFilter, setStatusFilter,
    reservations: filteredReservations, stats, updating, updateStatus,
    reload: loadShopAndReservations,
  }
}
