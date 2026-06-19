'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Package, TrendingUp, Leaf, MapPin, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'

export interface PublicPack {
  id: string
  shop_id: string
  title: string
  description: string
  price_cents: number
  original_price_cents: number | null
  remaining_stock: number
  total_stock: number
  shop_name: string
  shop_city: string
  shop_verified: boolean
  shop_rating: number
  image_url: string | null
}

interface Props {
  pack: PublicPack
  onReserve: (id: string) => void
  index: number
  reserving: string | null
}

export default function PackCardPublic({ pack, onReserve, index, reserving }: Props) {
  const isAvailable = pack.remaining_stock > 0
  const discount =
    pack.original_price_cents && pack.original_price_cents > pack.price_cents
      ? Math.round((1 - pack.price_cents / pack.original_price_cents) * 100)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative h-full rounded-2xl dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 group-hover:border-primary/30 transition-all duration-300 overflow-hidden">
        <div className="absolute top-3 right-3 z-10">
          {discount && (
            <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">-{discount}%</div>
          )}
        </div>
        <div className="absolute top-3 left-3 z-10">
          <div className="px-2 py-1 bg-primary/20 backdrop-blur-sm text-primary text-xs font-medium rounded-lg flex items-center gap-1">
            <Leaf className="w-3 h-3" /> Rescatado
          </div>
        </div>

        <div className="h-44 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
          <Image
            src={pack.image_url ?? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
            alt={pack.title}
            fill
            className="object-cover transform group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="dark:text-white text-gray-900 font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {pack.title}
            </h3>
            <div className="text-right">
              <span className="text-primary font-bold text-xl">{formatPrice(pack.price_cents)}</span>
              {pack.original_price_cents && (
                <p className="text-xs text-gray-500 line-through">{formatPrice(pack.original_price_cents)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{pack.shop_name}</span>
            {pack.shop_verified && <span className="text-primary text-xs ml-1">Verificado</span>}
          </div>

          <p className="dark:text-gray-400 text-gray-600 text-sm mb-3 line-clamp-2">{pack.description}</p>

          <div className="flex items-center justify-between text-xs dark:text-gray-500 text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>{pack.remaining_stock} disponibles</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Recogida local</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-primary">+2 comidas</span>
            </div>
          </div>

          <button
            onClick={() => onReserve(pack.id)}
            disabled={!isAvailable || reserving === pack.id}
            className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              isAvailable
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-400 text-gray-500 cursor-not-allowed'
            }`}
          >
            {reserving === pack.id ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isAvailable ? (
              'Reservar ahora'
            ) : (
              'Agotado'
            )}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      </div>
    </motion.div>
  )
}
