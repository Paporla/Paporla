'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Navigation, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { Reservation } from '@/types/reservation'

interface NextPickupCardProps {
  reservation: Reservation
}

export default function NextPickupCard({ reservation }: NextPickupCardProps) {
  if (!reservation.pack || !reservation.shop) {
    return null
  }

  const googleMapsUrl = reservation.shop?.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop.address)}`
    : null;

  const hasPickupInfo = reservation.pickup_date && reservation.pickup_end_time;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 }}
    >
      <Card glass className="border-primary/30 overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-4 p-4">
          <div className="bg-primary/20 p-3 rounded-full">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
                    <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-primary font-medium">Próxima recogida</p>
            <h3 className="text-lg font-semibold text-white">{reservation.pack.title}</h3>
            <p className="text-gray-400 text-sm">{reservation.shop.name}</p>
            
            {hasPickupInfo && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Límite: {reservation.pickup_end_time?.slice(0,5)}</span>
                </div>
                <CountdownTimer
                  targetDate={reservation.pickup_date!}
                  targetEndTime={reservation.pickup_end_time!}
                />
              </div>
            )}
          </div>
                    <div className="flex flex-col items-center gap-2">
            <p className="text-2xl font-bold text-primary font-mono">{reservation.pickup_code}</p>
            <p className="text-xs text-gray-400">Código de recogida</p>
            
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                Cómo llegar
              </a>
            )}
          </div>
          <Link href={`/packs/${reservation.pack.id}`}>
            <Button variant="outline" size="sm">Ver detalles</Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  )
}