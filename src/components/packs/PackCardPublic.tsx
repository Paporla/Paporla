'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Package, MapPin, Clock, Navigation } from 'lucide-react'
import { formatMinorPrice } from '@/lib/utils/formatPrice'

export interface PublicPack {
  id: string
  shop_id: string
  locality_id: string
  title: string
  description: string | null
  category: string
  tags: string[]
  allergen_notice: string | null
  price_minor: number
  original_price_minor: number | null
  currency_code: string
  remaining_stock: number
  pickup_start_at: string
  pickup_end_at: string
  timezone: string
  image_url: string | null
  shop_name: string
  shop_category: string | null
  locality_name: string
  shop_address: string | null
  shop_latitude: number | null
  shop_longitude: number | null
  shop_rating: number | null
  shop_rating_count: number
  distance_meters: number | null
}

function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null
  if (meters < 100) return '< 100 m'
  if (meters < 1000) return `${Math.round(meters / 100) * 100} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/*
 * Ventana de recogida COMPLETA y compacta: "vie, 18:00–20:00".
 *
 * Antes se mostraba solo la hora de inicio y el usuario no sabía hasta
 * cuándo podía pasar a recoger: la hora de fin es la mitad de la decisión
 * ("¿me da tiempo después del trabajo?"). El detalle del pack ya muestra la
 * ventana entera (formatPickupWindow); la tarjeta cuenta lo mismo en corto.
 */
function formatPickupTime(startAt: string, endAt: string, timezone: string): string {
  try {
    const time = new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      // 24h explícito (estándar comercial en Chile, igual que formatDate.ts):
      // sin esto el resultado depende de la versión de ICU de cada máquina.
      hourCycle: 'h23',
      timeZone: timezone,
    })
    const weekday = new Intl.DateTimeFormat('es-CL', { weekday: 'short', timeZone: timezone })
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(start.getTime())) return 'Horario por confirmar'
    if (Number.isNaN(end.getTime())) return `${weekday.format(start)}, ${time.format(start)}`
    return `${weekday.format(start)}, ${time.format(start)}–${time.format(end)}`
  } catch {
    return 'Horario por confirmar'
  }
}

interface Props {
  pack: PublicPack
  onReserve: (id: string) => void
  index: number
  reserving: string | null
  reservationsEnabled?: boolean
}

export default function PackCardPublic({ pack, onReserve, index, reserving, reservationsEnabled = false }: Props) {
  const isAvailable = pack.remaining_stock > 0
  const canReserve = isAvailable && reservationsEnabled
  const hasDiscount = pack.original_price_minor != null && pack.original_price_minor > pack.price_minor
  const discount = hasDiscount ? Math.round((1 - pack.price_minor / pack.original_price_minor!) * 100) : null

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
          <div className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-md">
            Disponible
          </div>
        </div>

        <Link href={`/packs/${pack.id}`} className="block">
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

          <div className="p-5 pb-0">
            <div className="flex items-start justify-between mb-2 gap-3">
              <h3 className="dark:text-white text-gray-900 font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {pack.title}
              </h3>
              <div className="text-right flex-shrink-0">
                <span className="text-primary font-bold text-xl">
                  {formatMinorPrice(pack.price_minor, pack.currency_code, 'es-CL')}
                </span>
                {hasDiscount && (
                  <p className="text-xs text-gray-500 line-through">
                    {formatMinorPrice(pack.original_price_minor!, pack.currency_code, 'es-CL')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400 mb-2">
              <MapPin className="w-3 h-3" />
              <span>{pack.shop_name}</span>
              <span className="text-primary text-xs ml-1">Verificado</span>
            </div>

            <p className="dark:text-gray-400 text-gray-600 text-sm mb-3 line-clamp-2">
              {pack.description || 'Pack sorpresa preparado por el comercio.'}
            </p>

            <div className="flex items-center justify-between gap-2 text-xs dark:text-gray-500 text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>{pack.remaining_stock} disponibles</span>
              </div>
              {formatDistance(pack.distance_meters) ? (
                <div className="flex items-center gap-1 text-primary font-medium">
                  <Navigation className="w-3 h-3" />
                  <span>{formatDistance(pack.distance_meters)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{pack.locality_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>{formatPickupTime(pack.pickup_start_at, pack.pickup_end_at, pack.timezone)}</span>
              </div>
            </div>
          </div>
        </Link>

        <div className="px-5 pb-5">
          <button
            onClick={() => canReserve && onReserve(pack.id)}
            disabled={!canReserve || reserving === pack.id}
            className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              canReserve
                ? 'bg-primary text-black hover:bg-primary/90'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-400 text-gray-500 cursor-not-allowed'
            }`}
          >
            {reserving === pack.id ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : !isAvailable ? (
              'Agotado'
            ) : reservationsEnabled ? (
              'Reservar ahora'
            ) : (
              'Reservas próximamente'
            )}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      </div>
    </motion.div>
  )
}
