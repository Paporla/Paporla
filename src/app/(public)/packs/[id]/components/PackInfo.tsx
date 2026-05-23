'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'

interface PackInfoProps {
  title: string
  priceCents: number
  originalPriceCents: number | null
  remainingStock: number
  totalStock: number
  description: string | null
  pickupDate: string | null
  pickupStartTime: string | null
  pickupEndTime: string | null
  isAvailable: boolean
}

export default function PackInfo({
  title,
  priceCents,
  originalPriceCents,
  remainingStock,
  totalStock,
  description,
  pickupDate,
  pickupStartTime,
  pickupEndTime,
  isAvailable: _isAvailable,
}: PackInfoProps) {
  const calculateDiscount = () => {
    if (!originalPriceCents || originalPriceCents <= priceCents) return null
    return Math.round((1 - priceCents / originalPriceCents) * 100)
  }

  const discount = calculateDiscount()

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">{title}</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{formatPrice(priceCents)}</span>
          {originalPriceCents && (
            <span className="text-lg dark:text-gray-500 text-gray-400 line-through">
              {formatPrice(originalPriceCents)}
            </span>
          )}
          {discount && (
            <span className="text-sm bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">-{discount}%</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Package className="w-4 h-4 dark:text-gray-400 text-gray-600" />
        <span className="dark:text-gray-400 text-gray-600">
          Stock disponible: <span className="text-primary font-semibold">{remainingStock}</span> / {totalStock} unidades
        </span>
      </div>

      {description && (
        <div className="p-4 glass-card rounded-xl">
          <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Descripcion</h3>
          <p className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      )}

      {(pickupDate || pickupStartTime) && (
        <div className="p-4 glass-card rounded-xl">
          <h3 className="font-semibold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Informacion de recogida
          </h3>
          <div className="space-y-2 text-sm">
            {pickupDate && (
              <div className="flex items-center gap-2 dark:text-gray-400 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(pickupDate)}</span>
              </div>
            )}
            {(pickupStartTime || pickupEndTime) && (
              <div className="flex items-center gap-2 dark:text-gray-400 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {pickupStartTime?.slice(0, 5)} - {pickupEndTime?.slice(0, 5)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
