'use client'

import Image from 'next/image'
import { Calendar, CreditCard, MapPin, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'

interface PackCheckoutSummaryProps {
  pack: {
    id: string
    title: string
    description: string | null
    price_cents: number
    image_url: string | null
    pickup_date: string | null
    pickup_start_time: string | null
    pickup_end_time: string | null
    shop: {
      id: string
      name: string
      address: string | null
    }
  }
  quantity: number
  paymentMethod: 'cash' | 'demo'
  onClose: () => void
  onConfirm: () => void
  reserving: boolean
}

export default function PackCheckoutSummary({
  pack,
  quantity,
  paymentMethod,
  onClose,
  onConfirm,
  reserving,
}: PackCheckoutSummaryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-md w-full bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="text-center pt-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <CreditCard className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-white">Confirmar Reserva</h2>
          <p className="text-gray-400 text-sm mt-1">Revisa los detalles antes de confirmar</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Pack info */}
          <div className="flex gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
              {pack.image_url ? (
                <Image src={pack.image_url} alt={pack.title} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{pack.title}</p>
              <p className="text-xs text-gray-400">{pack.shop.name}</p>
              <p className="text-sm text-primary font-bold mt-1">{formatPrice(pack.price_cents)} x {quantity}</p>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <span className="text-white font-semibold">Total a pagar</span>
            <span className="text-xl font-bold text-primary">{formatPrice(pack.price_cents * quantity)}</span>
          </div>

          {/* Método de pago */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Método de pago: <strong className="text-white">{paymentMethod === 'cash' ? 'Efectivo' : 'Demo'}</strong></span>
          </div>

          {/* Info de recogida */}
          {(pack.pickup_date || pack.pickup_start_time) && (
            <div className="text-sm text-gray-400 space-y-1">
              <Calendar className="w-4 h-4 text-primary inline mr-1" />
              {pack.pickup_date && <span>{formatDate(pack.pickup_date)}</span>}
              {(pack.pickup_start_time || pack.pickup_end_time) && (
                <span> de {pack.pickup_start_time?.slice(0,5)} a {pack.pickup_end_time?.slice(0,5)}</span>
              )}
            </div>
          )}

          {pack.shop.address && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{pack.shop.address}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={reserving}>
              {reserving ? 'Reservando...' : 'Confirmar y Pagar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
