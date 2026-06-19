'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Store, CheckCircle, MapPin, Clock, Phone, Globe, Star } from 'lucide-react'
import FavoriteButton from '@/components/favorites/FavoriteButton'

interface ShopDetailHeaderProps {
  shop: {
    id: string
    name: string
    description: string | null
    cover_url: string | null
    logo_url: string | null
    verified: boolean
    address: string | null
    city: string | null
    phone: string | null
    website?: string | null
    rating: number
    packsCount: number
  }
}

export default function ShopDetailHeader({ shop }: ShopDetailHeaderProps) {
  const router = useRouter()
  const hasLogo = shop.logo_url && shop.logo_url.trim() !== ''

  return (
    <div className="relative min-h-[420px] md:min-h-[480px] w-full">
      {/* Cover image */}
      {shop.cover_url ? (
        <div className="absolute inset-0">
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" sizes="100vw" priority />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-[#0a0a1a] to-secondary/10" />
      )}

      {/* Overlay gradiente */}
      <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-[#0a0a1a] dark:via-[#0a0a1a]/70 dark:to-transparent bg-gradient-to-t from-gray-50 via-gray-50/70 to-transparent" />

      {/* Boton volver */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 p-2.5 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:bg-black/70 transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Favorito */}
      <div className="absolute top-4 right-4 z-10">
        <FavoriteButton shopId={shop.id} size="md" />
      </div>

      {/* Contenido principal alineado abajo */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-start md:items-end gap-6"
        >
          {/* Logo */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 dark:border-white/10 border-gray-200 dark:bg-[#0a0a1a] bg-white flex-shrink-0 shadow-xl">
            {hasLogo ? (
              <Image
                src={shop.logo_url!}
                alt={shop.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-8 h-8 text-gray-600" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl md:text-3xl font-bold dark:text-white text-gray-900 truncate">{shop.name}</h1>
              {shop.verified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/15 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verificado
                </span>
              )}
              {shop.rating > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-medium">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  {shop.rating.toFixed(1)}
                </span>
              )}
            </div>

            {shop.description && (
              <p className="dark:text-gray-400 text-gray-600 text-sm md:text-base line-clamp-2 mb-3 max-w-2xl">
                {shop.description}
              </p>
            )}

            {/* Info chips */}
            <div className="flex flex-wrap gap-2">
              {(shop.address ?? shop.city) && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 rounded-lg dark:text-gray-400 text-gray-600 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {shop.address}
                  {shop.city ? `, ${shop.city}` : ''}
                </span>
              )}
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 rounded-lg dark:text-gray-400 text-gray-600 text-xs hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  {shop.phone}
                </a>
              )}
              {shop.website && (
                <a
                  href={shop.website.startsWith('http') ? shop.website : `https://${shop.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 rounded-lg dark:text-gray-400 text-gray-600 text-xs hover:text-primary hover:border-primary/30 transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  {shop.website
                    .replace(/^https?:\/\//, '')
                    .replace(/\/$/, '')
                    .slice(0, 20)}
                </a>
              )}
              <span className="inline-flex items-center gap-1 px-3 py-1.5 dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 rounded-lg dark:text-gray-400 text-gray-600 text-xs">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {shop.packsCount} pack{shop.packsCount !== 1 ? 's' : ''} disponible{shop.packsCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
