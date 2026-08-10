'use client'

import Image from 'next/image'
import { CreditCard, Calendar, MapPin, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'

interface PackReservationModalProps {
  pack: {
    id: string
    title: string
    image_url: string | null
    price_cents: number
    shop: { name: string; address: string | null }
    pickup_date: string | null
    pickup_start_time: string | null
    pickup_end_time: string | null
  }
  quantity: number
  paymentMethod: string
  reserving: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function PackReservationModal({
  pack,
  quantity,
  paymentMethod,
  reserving,
  onClose,
  onConfirm,
}: PackReservationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 dark:bg-black/80 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full dark:bg-gray-900 bg-white rounded-2xl dark:border-white/10 border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center pt-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <CreditCard className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold dark:text-white text-gray-900">Confirmar Reserva</h2>
          <p className="dark:text-gray-400 text-gray-600 text-sm mt-1">Revisa los detalles antes de confirmar</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3 p-3 dark:bg-white/5 bg-gray-100 rounded-xl">
            <div className="w-16 h-16 rounded-lg overflow-hidden dark:bg-gray-800 bg-gray-200 flex-shrink-0 relative">
              {pack.image_url ? (
                <Image src={pack.image_url} alt={pack.title} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 dark:text-gray-600 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="dark:text-white text-gray-900 font-medium truncate">{pack.title}</p>
              <p className="text-xs dark:text-gray-400 text-gray-600">{pack.shop.name}</p>
              <p className="text-sm text-primary font-bold mt-1">
                {formatPrice(pack.price_cents)} x {quantity}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <span className="dark:text-white text-gray-900 font-semibold">Total a pagar</span>
            <span className="text-xl font-bold text-primary">{formatPrice(pack.price_cents * quantity)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>
              Metodo de pago:{' '}
              <strong className="dark:text-white text-gray-900">
                {paymentMethod === 'cash' ? 'Efectivo' : 'Demo'}
              </strong>
            </span>
          </div>

          {(pack.pickup_date ?? pack.pickup_start_time) && (
            <div className="text-sm dark:text-gray-400 text-gray-600 space-y-1">
              <Calendar className="w-4 h-4 text-primary inline mr-1" />
              {pack.pickup_date && <span>{formatDate(pack.pickup_date)}</span>}
              {(pack.pickup_start_time ?? pack.pickup_end_time) && (
                <span>
                  {' '}
                  de {pack.pickup_start_time?.slice(0, 5)} a {pack.pickup_end_time?.slice(0, 5)}
                </span>
              )}
            </div>
          )}

          {pack.shop.address && (
            <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{pack.shop.address}</span>
            </div>
          )}

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
