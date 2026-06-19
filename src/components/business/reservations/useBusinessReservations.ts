'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

export interface ReservationItem {
  id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: string
  created_at: string
  pickup_code: string
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  user: { name: string; email: string; phone: string | null }
  pack: { id: string; title: string; price_cents: number }
}

export function useBusinessReservations() {
  const { data: shop } = useBusinessShop()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const { data: reservations = [], isLoading: loading } = useQuery({
    queryKey: ['business-reservations', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          id, user_id, quantity, total_price_cents, status, created_at,
          pickup_code, pickup_date, pickup_start_time, pickup_end_time,
          pack:packs(id, title, price_cents),
          user:user_profiles(name, email, phone)
        `,
        )
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as ReservationItem[]).map((r) => ({
        ...r,
        user: r.user ?? { name: 'Usuario', email: 'N/A', phone: null },
      }))
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business-reservations', shop?.id] })

  const updateMutation = useMutation({
    mutationFn: async ({ reservationId, newStatus }: { reservationId: string; newStatus: string }) => {
      const supabase = supabaseBrowser()

      if (newStatus === 'cancelled') {
        const { data, error: rpcError } = await supabase.rpc('cancel_reservation', {
          p_reservation_id: reservationId,
          p_cancel_reason: 'Cancelado por el comercio',
        })
        if (rpcError) throw rpcError
        if (!data?.success) throw new Error(data?.error || 'Error al cancelar')
      } else if (newStatus === 'picked_up') {
        const { data: reservation } = await supabase
          .from('reservations')
          .select('pickup_code')
          .eq('id', reservationId)
          .maybeSingle()
        if (!reservation?.pickup_code) throw new Error('No se encontro el codigo de recogida')
        const { data, error: rpcError } = await supabase.rpc('validate_pickup', {
          p_pickup_code: reservation.pickup_code,
        })
        if (rpcError) throw rpcError
        if (!data?.success) throw new Error(data?.error || 'Error al validar recogida')
      } else {
        const updates: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'no_show') {
          updates.updated_at = new Date().toISOString()
        }
        const { error: updateError } = await supabase.from('reservations').update(updates).eq('id', reservationId)
        if (updateError) throw updateError
      }
    },
    onSuccess: () => {
      invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const filteredReservations = useMemo(() => {
    let filtered = [...reservations]
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.pack.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.pickup_code?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }
    return filtered
  }, [searchTerm, statusFilter, reservations])

  const stats = useMemo(
    () => ({
      total: reservations.length,
      pending: reservations.filter((r) => ['confirmed', 'pending'].includes(r.status)).length,
      confirmed: reservations.filter((r) => r.status === 'confirmed').length,
      completed: reservations.filter((r) => r.status === 'picked_up').length,
      cancelled: reservations.filter((r) => r.status === 'cancelled').length,
      noShow: reservations.filter((r) => r.status === 'no_show').length,
      totalRevenue: reservations.reduce((sum, r) => sum + (r.total_price_cents ?? 0), 0),
    }),
    [reservations],
  )

  const updateStatus = async (reservationId: string, newStatus: string) => {
    setUpdating(reservationId)
    setError('')
    setSuccess('')

    try {
      await updateMutation.mutateAsync({ reservationId, newStatus })

      const labels: Record<string, string> = {
        confirmed: 'confirmada',
        no_show: 'marcada como no retirada',
        picked_up: 'Recogida validada correctamente',
        cancelled: 'Reserva cancelada y stock reintegrado',
      }
      setSuccess(labels[newStatus] || 'Reserva actualizada correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la reserva')
    }

    setUpdating(null)
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
    updateStatus,
    reload: invalidate,
  }
}
