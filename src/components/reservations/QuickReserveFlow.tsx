'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  CheckCircle, Package, Clock, MapPin, CreditCard,
  ShoppingBag, X, Navigation, Copy
} from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'

interface PackData {
  id: string
  title: string
  description: string | null
  price_cents: number
  image_url: string | null
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  remaining_stock: number
  shop_id: string
  shop: { id: string; name: string; address: string | null; phone: string | null }
}

interface QuickReserveFlowProps {
  pack: PackData
  onClose: () => void
  onSuccess: () => void
}

type FlowStep = 'review' | 'reserving' | 'confirmed' | 'error'

export default function QuickReserveFlow({ pack, onClose, onSuccess }: QuickReserveFlowProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [step, setStep] = useState<FlowStep>('review')
  const [error, setError] = useState('')
  const [confirmedData, setConfirmedData] = useState<any>(null)

  const handleConfirm = async () => {
    if (!user) { router.push('/login'); return }
    setStep('reserving')
    setError('')

    try {
      const { data: existing } = await supabase
        .from('reservations')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('pack_id', pack.id)
        .eq('status', 'confirmed')
        .maybeSingle()

      if (existing) { setError('Ya tienes una reserva activa para este pack'); setStep('error'); return }

      const { data: reservation, error: insertError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          shop_id: pack.shop_id,
          pack_id: pack.id,
          quantity: 1,
          total_price_cents: pack.price_cents,
          status: 'confirmed',
          payment_method: 'demo',
          payment_status: 'completed',
          pickup_date: pack.pickup_date,
          pickup_start_time: pack.pickup_start_time,
          pickup_end_time: pack.pickup_end_time,
          reserved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) { setError(insertError.message); setStep('error'); return }

      setConfirmedData(reservation)
      await new Promise(r => setTimeout(r, 800))
      setStep('confirmed')
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Error al reservar')
      setStep('error')
    }
  }

  const getMapsUrl = () => {
    if (!pack.shop.address) return null
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(pack.shop.address)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dark:bg-black/80 bg-black/40 backdrop-blur-sm"
      onClick={step !== 'reserving' ? onClose : undefined}>
      <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div key="review"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dark:bg-gradient-to-b dark:from-gray-900 dark:to-black bg-white border dark:border-white/10 border-gray-200 rounded-2xl overflow-hidden shadow-2xl">
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
                {pack.image_url ? <Image src={pack.image_url} alt={pack.title} fill className="object-cover" sizes="400px" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full dark:bg-black/40 bg-black/20 dark:text-white text-gray-900 hover:dark:bg-black/60 hover:bg-black/30">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <h2 className="text-xl font-bold dark:text-white text-gray-900">{pack.title}</h2>
                <p className="dark:text-gray-400 text-gray-600 text-sm">{pack.shop.name}</p>
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <span className="dark:text-gray-300 text-gray-700 text-sm">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatPrice(pack.price_cents)}</span>
                </div>
                {pack.pickup_date && (
                  <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{formatDate(pack.pickup_date)} {pack.pickup_start_time?.slice(0,5)} - {pack.pickup_end_time?.slice(0,5)}</span>
                  </div>
                )}
                {pack.shop.address && (
                  <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{pack.shop.address}</span>
                  </div>
                )}
                <Button onClick={handleConfirm} className="w-full py-4 text-base font-bold">
                  Confirmar Reserva - {formatPrice(pack.price_cents)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'reserving' && (
            <motion.div key="reserving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="dark:bg-gradient-to-b dark:from-gray-900 dark:to-black bg-white dark:border-white/10 border-gray-200 rounded-2xl p-10 text-center shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-lg font-semibold dark:text-white text-gray-900">Reservando tu pack...</p>
            </motion.div>
          )}

          {step === 'confirmed' && confirmedData && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="dark:bg-gradient-to-b dark:from-gray-900 dark:to-black bg-white border border-primary/30 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
              <div className="p-6 text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white text-gray-900">Reserva Confirmada!</h2>
                <p className="dark:text-gray-400 text-gray-600">Tu pack te espera en {pack.shop.name}</p>
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-5">
                  <p className="text-xs dark:text-gray-400 text-gray-600 uppercase tracking-wider">Codigo de recogida</p>
                  <p className="text-4xl font-bold text-primary tracking-[0.3em] font-mono py-2">{confirmedData.pickup_code}</p>
                  <CopyButton text={confirmedData.pickup_code} label="Copiar codigo" />
                </div>
                {getMapsUrl() && (
                  <a href={getMapsUrl()!} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
                    <Navigation className="w-4 h-4" /> Como llegar
                  </a>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={onClose}>Cerrar</Button>
                  <Button className="flex-1" onClick={() => { onClose(); router.push('/dashboard') }}>
                    <ShoppingBag className="w-4 h-4" /> Mis reservas
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="dark:bg-gradient-to-b dark:from-gray-900 dark:to-black bg-white border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Error</h2>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
