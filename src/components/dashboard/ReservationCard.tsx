'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar, CreditCard, Navigation, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import { STATUS_CONFIG, STATUS_LABELS } from '@/lib/constants/reservations'
import { Reservation } from '@/types/reservation'

interface ReservationCardProps {
  reservation: Reservation
  showCancel?: boolean
  onCancel?: (id: string) => void
  cancelling?: string | null
}

const getStatusBadge = (status: string) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.confirmed
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function ReservationCard({
  reservation,
  showCancel = false,
  onCancel,
  cancelling,
}: ReservationCardProps) {
  if (!reservation.pack || !reservation.shop) {
    return null
  }

  const googleMapsUrl = reservation.shop?.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop.address)}`
    : null

  const hasPickupInfo = reservation.pickup_date && reservation.pickup_end_time
  const isActive = reservation.status === 'confirmed'

  return (
    <Card glass hover className="mb-4 overflow-hidden transition-all duration-300 group">
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {reservation.pack.image_url && (
          <Link
            href={`/packs/${reservation.pack.id}`}
            className="w-full md:w-28 h-28 rounded-lg overflow-hidden flex-shrink-0 relative block"
          >
            <div className="relative w-full h-full">
              <Image
                src={reservation.pack.image_url}
                alt={reservation.pack.title}
                fill
                className="object-cover"
                sizes="112px"
              />
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <Link
              href={`/packs/${reservation.pack.id}`}
              className="text-lg font-semibold dark:text-white text-gray-900 hover:text-primary transition-colors truncate block"
            >
              {reservation.pack.title}
            </Link>
            {getStatusBadge(reservation.status)}
          </div>

          <Link
            href={`/shops/${reservation.shop.id}`}
            className="dark:text-gray-400 text-gray-600 text-sm mb-2 block hover:text-primary transition-colors"
          >
            {reservation.shop.name}
          </Link>

          {reservation.shop.address && (
            <p className="text-gray-500 text-xs flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" />
              {reservation.shop.address}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(reservation.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {formatPrice(reservation.total_price_cents)} ({reservation.quantity || 1}x)
            </span>
          </div>

          {/* Hora limite de recogida + countdown */}
          {hasPickupInfo && isActive && (
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Recoge antes de las {reservation.pickup_end_time?.slice(0, 5)}</span>
              </div>
              <CountdownTimer targetDate={reservation.pickup_date!} targetEndTime={reservation.pickup_end_time!} />
            </div>
          )}

          {/* Codigo de recogida */}
          {isActive && reservation.pickup_code && (
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 mb-3 inline-flex items-center gap-3">
              <div>
                <p className="text-xs dark:text-gray-400 text-gray-600">Codigo de recogida</p>
                <p className="text-xl font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
              </div>
              <CopyButton text={reservation.pickup_code} label="Copiar" />
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                Como llegar
              </a>
            )}

            {showCancel && isActive && onCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onCancel(reservation.id)}
                loading={cancelling === reservation.id}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
