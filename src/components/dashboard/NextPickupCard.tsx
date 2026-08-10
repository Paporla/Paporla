'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Navigation, Clock, MapPin, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import CountdownTimer from '@/components/ui/CountdownTimer'
import type { ReservationWithDetails } from '@/types/reservation'

interface NextPickupCardProps {
  reservation: ReservationWithDetails
  loading?: boolean
  error?: string
}

export default function NextPickupCard({ reservation, loading, error }: NextPickupCardProps) {
  // Estado de error
  if (error) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card glass className="border-red-500/30 p-5 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </Card>
      </motion.div>
    )
  }

  // Estado de carga
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card glass className="border-primary/20 p-5 animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
            <div className="w-28 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </Card>
      </motion.div>
    )
  }

  if (!reservation.pack || !reservation.shop) return null

  const googleMapsUrl = reservation.shop.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop.address)}`
    : null

  const hasPickupInfo = reservation.pickup_date && reservation.pickup_end_time

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
      <Card glass className="border-primary/30 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5">
          {/* Imagen del pack */}
          {reservation.pack.image_url && (
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 relative">
              <Image
                src={reservation.pack.image_url}
                alt={reservation.pack.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          )}

          {/* Informacion principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Proxima recogida</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <Link href={`/packs/${reservation.pack.id}`}>
              <h3 className="text-lg font-bold dark:text-white text-gray-900 hover:text-primary transition-colors line-clamp-1">
                {reservation.pack.title}
              </h3>
            </Link>
            <Link href={`/shops/${reservation.shop.id}`}>
              <p className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary transition-colors">
                {reservation.shop.name}
              </p>
            </Link>

            {reservation.shop.address && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {reservation.shop.address}
              </p>
            )}

            {hasPickupInfo && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Recoge antes de las {reservation.pickup_end_time?.slice(0, 5)}</span>
                </div>
                <CountdownTimer targetDate={reservation.pickup_date!} targetEndTime={reservation.pickup_end_time!} />
              </div>
            )}
          </div>

          {/* Codigo y acciones */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] dark:text-gray-400 text-gray-600">Codigo</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
                <CopyButton text={reservation.pickup_code} label="" />
              </div>
            </div>

            <div className="flex gap-2">
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Como llegar
                </a>
              )}
              <Link href={`/packs/${reservation.pack.id}`}>
                <Button variant="outline" size="sm">
                  Ver detalles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
