'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, MapPin, Navigation, Calendar, Package } from 'lucide-react'
import CountdownTimer from '@/components/ui/CountdownTimer'
import CopyButton from '@/components/ui/CopyButton'
import { formatDate } from '@/lib/utils/formatDate'
import type { Reservation } from '@/types/reservation'

interface NextPickupBannerProps {
  reservation: Reservation
}

export default function NextPickupBanner({ reservation }: NextPickupBannerProps) {
  if (!reservation.pack || !reservation.shop) return null

  const pickupDateTime = reservation.pickup_date
    ? `${formatDate(reservation.pickup_date)} ${reservation.pickup_end_time?.slice(0, 5) || ''}`
    : 'Proximamente'

  const mapsUrl = reservation.shop.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop.address)}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
    >
      {/* Fondo decorativo */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

      <div className="relative p-5 space-y-4">
        {/* Label "PRÓXIMA RECOGIDA" */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Proxima recogida</span>
        </div>

        <div className="flex items-start gap-4">
          {/* Imagen del pack */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
            {reservation.pack.image_url ? (
              <Image
                src={reservation.pack.image_url}
                alt={reservation.pack.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Link
              href={`/packs/${reservation.pack_id}`}
              className="text-lg font-bold dark:text-white text-gray-900 hover:text-primary transition-colors"
            >
              {reservation.pack.title}
            </Link>
            <Link
              href={`/shops/${reservation.shop.id}`}
              className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary transition-colors block"
            >
              {reservation.shop.name}
            </Link>

            {/* Cuenta regresiva */}
            {reservation.pickup_date && reservation.pickup_end_time && (
              <div className="mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <CountdownTimer targetDate={reservation.pickup_date} targetEndTime={reservation.pickup_end_time} />
              </div>
            )}
          </div>
        </div>

        {/* Codigo de recogida */}
        <div className="flex items-center justify-between dark:bg-black/40 bg-gray-100 rounded-xl p-3 border dark:border-white/5 border-gray-200">
          <div>
            <p className="text-xs dark:text-gray-500 text-gray-400">Codigo de recogida</p>
            <p className="text-xl font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
          </div>
          <CopyButton text={reservation.pickup_code} label="Copiar" />
        </div>

        {/* Info + mapa */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <Calendar className="w-3 h-3 text-primary" />
          <span>{pickupDateTime}</span>
          {reservation.shop.address && (
            <>
              <MapPin className="w-3 h-3 text-primary ml-2" />
              <span className="truncate max-w-[200px]">{reservation.shop.address}</span>
            </>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 ml-auto text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Navigation className="w-3 h-3" />
              Como llegar
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
