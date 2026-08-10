'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AnimatePresence } from 'framer-motion'
import { Clock } from 'lucide-react'
import Toast from '@/components/ui/Toast'
import PickupCard, { PickupItem } from './pickups/PickupCard'

interface Props {
  shopId: string
}

interface RawReservation {
  id: string
  pickup_code: string
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  status: string
  pack_id: string
  user_id: string
}

export default function TodayPickups({ shopId }: Props) {
  const supabase = supabaseBrowser()
  const queryClient = useQueryClient()
  const [validating, setValidating] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { data: pickups = [], isLoading: loading } = useQuery({
    queryKey: ['today-pickups', shopId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('reservations')
        .select('id,pickup_code,pickup_date,pickup_start_time,pickup_end_time,status,pack_id,user_id')
        .eq('shop_id', shopId)
        .in('status', ['confirmed', 'ready_pickup'])
        .or(`pickup_date.eq.${today},pickup_date.is.null`)
        .order('pickup_start_time', { ascending: true })

      if (!data) return []

      const enriched = await Promise.all(
        (data as RawReservation[]).map(async (r) => {
          const { data: u } = await supabase.from('user_profiles').select('name').eq('id', r.user_id).maybeSingle()
          const { data: p } = await supabase.from('packs').select('title').eq('id', r.pack_id).maybeSingle()
          return { ...r, user_name: u?.name ?? 'Usuario', pack_title: p?.title ?? 'Pack' } as PickupItem
        }),
      )
      return enriched
    },
    refetchInterval: 15000,
    staleTime: 5000,
  })

  const validateMutation = useMutation({
    mutationFn: async (pickup: PickupItem) => {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
        .eq('id', pickup.id)
        .eq('shop_id', shopId)

      if (updateError) throw new Error(updateError.message)
      return pickup
    },
    onSuccess: (pickup) => {
      setToast({ message: `Recogida validada para ${pickup.user_name}`, type: 'success' })
      queryClient.invalidateQueries({ queryKey: ['today-pickups', shopId] })
    },
    onError: (err: Error) => {
      setToast({ message: err.message, type: 'error' })
    },
    onSettled: () => {
      setValidating(null)
    },
  })

  const handleValidate = async (pickup: PickupItem): Promise<string | null> => {
    setValidating(pickup.id)
    setToast(null)
    try {
      await validateMutation.mutateAsync(pickup)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Error desconocido'
    }
  }

  if (loading)
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 dark:bg-white/5 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )

  if (pickups.length === 0)
    return (
      <div className="text-center py-8 px-4 dark:bg-white/5 bg-gray-50 rounded-xl border border-dashed dark:border-white/10 border-gray-200">
        <Clock className="w-10 h-10 dark:text-gray-600 text-gray-400 mx-auto mb-2" />
        <p className="dark:text-gray-400 text-gray-600 font-medium">No hay recogidas programadas para hoy</p>
        <p className="text-xs dark:text-gray-600 text-gray-400 mt-1">Las reservas apareceran aqui automaticamente</p>
      </div>
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recogidas de Hoy
          <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded-full">{pickups.length}</span>
        </h2>
        <span className="text-xs text-gray-500">Auto-actualizable</span>
      </div>
      <AnimatePresence>
        {pickups.map((p, i) => (
          <PickupCard key={p.id} pickup={p} index={i} validating={validating} onValidate={handleValidate} />
        ))}
      </AnimatePresence>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
