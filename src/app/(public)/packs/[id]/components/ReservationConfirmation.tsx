'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'

interface ReservationConfirmationProps {
  pickupCode: string
  packTitle: string
  shopName: string
  totalPriceCents: number
  quantity: number
}

export default function ReservationConfirmation({
  pickupCode,
  packTitle,
  shopName,
  totalPriceCents,
  quantity,
}: ReservationConfirmationProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Reserva Confirmada!</h2>
        <p className="dark:text-gray-400 text-gray-600">
          {packTitle} en {shopName}
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm dark:text-gray-400 text-gray-600 mb-2">Tu codigo de recogida</p>
        <p className="text-4xl font-bold text-primary tracking-widest font-mono mb-3">{pickupCode}</p>
        <CopyButton text={pickupCode} label="Copiar codigo" />
      </div>

      <div className="dark:bg-white/5 bg-gray-100 rounded-xl p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="dark:text-gray-400 text-gray-600">Pack</span>
          <span className="dark:text-white text-gray-900 font-medium">{packTitle}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="dark:text-gray-400 text-gray-600">Comercio</span>
          <span className="dark:text-white text-gray-900 font-medium">{shopName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="dark:text-gray-400 text-gray-600">Cantidad</span>
          <span className="dark:text-white text-gray-900 font-medium">{quantity}x</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t dark:border-white/10 border-gray-200">
          <span className="dark:text-gray-400 text-gray-600">Total</span>
          <span className="text-primary font-bold text-lg">{formatPrice(totalPriceCents)}</span>
        </div>
      </div>

      <div className="text-xs dark:text-gray-500 text-gray-400 text-center mb-6 space-y-2">
        <p>Muestra este codigo al llegar al comercio para retirar tu pack.</p>
        <p>Recuerda pasar dentro del horario indicado de recogida.</p>
      </div>

      <Link href="/dashboard">
        <Button className="w-full flex items-center justify-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Ver mis reservas
          <ArrowRight className="w-5 h-5" />
        </Button>
      </Link>
    </motion.div>
  )
}
