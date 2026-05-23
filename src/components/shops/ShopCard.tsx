'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Store, MapPin, Star, CheckCircle } from 'lucide-react'
import FavoriteButton from '@/components/favorites/FavoriteButton'

interface ShopCardProps {
  shop: {
    id: string
    name: string
    description: string | null
    city: string | null
    cover_url: string | null
    rating: number
    verified: boolean
  }
  index?: number
}

export default function ShopCard({ shop, index = 0 }: ShopCardProps) {
  return (
    <Link href={`/shops/${shop.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        whileHover={{ y: -8 }}
        className="group relative cursor-pointer"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />

        <div className="relative h-full rounded-2xl dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 group-hover:border-primary/30 transition-all duration-300 overflow-hidden">
          {/* Imagen de portada */}
          <div className="h-40 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            {shop.cover_url ? (
              <Image
                src={shop.cover_url}
                alt={shop.name}
                fill
                className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-12 h-12 text-gray-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Badge verificado */}
            {shop.verified && (
              <div className="absolute top-3 left-3 z-10">
                <div className="px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verificado
                </div>
              </div>
            )}

            {/* Botón favorito */}
            <div className="absolute top-3 right-3 z-10">
              <FavoriteButton shopId={shop.id} size="sm" />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="dark:text-white text-gray-900 font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {shop.name}
              </h3>
              {shop.rating > 0 && (
                <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-yellow-400">{shop.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {shop.description && (
              <p className="dark:text-gray-400 text-gray-600 text-sm mb-3 line-clamp-2">{shop.description}</p>
            )}

            <div className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{shop.city || 'Ubicación no especificada'}</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </div>
      </motion.div>
    </Link>
  )
}
