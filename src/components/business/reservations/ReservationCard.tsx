'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, XCircle, User, Ban, Eye, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatPickupWindow } from '@/lib/utils/formatDate'
import { getStatusConfig, canCancelStatus, canConfirmStatus } from '@/lib/constants/reservations'
import type { ReservationItem } from './useBusinessReservations'

interface ReservationCardProps {
  reservation: ReservationItem
  index: number
  updating: string | null
  /** Si llega, la tarjeta pinta el botón Confirmar (solo para payment_pending, piloto 0031). */
  onConfirmClick?: (id: string) => void
  /** Si llega, la tarjeta pinta el botón Cancelar (solo para estados cancelables). */
  onCancelClick?: (id: string) => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  payment_pending: Clock,
  confirmed: CheckCircle,
  ready_pickup: Clock,
  picked_up: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: Ban,
  expired: Clock,
}

const borderColorMap: Record<string, string> = {
  payment_pending: 'border-l-amber-500/50',
  confirmed: 'border-l-blue-500/50',
  ready_pickup: 'border-l-primary',
  picked_up: 'border-l-green-500/50',
  completed: 'border-l-green-500/50',
  cancelled: 'border-l-red-500/50',
  no_show: 'border-l-orange-500/50',
  expired: 'border-l-gray-500/50',
}

/**
 * Tarjeta compacta de una reserva del comercio.
 *
 * Muestra solo lo que list_shop_reservations (0014:333) expone: título del
 * pack, nombre visible del cliente (sin email ni teléfono), importe en la
 * unidad menor de su moneda y la ventana de recogida en la zona horaria del
 * mercado. Sin código de recogida: se emite una sola vez al confirmar
 * (0031) y solo su huella sha256 vive en la base.
 */
export default function ReservationCard({
  reservation,
  index,
  updating,
  onConfirmClick,
  onCancelClick,
}: ReservationCardProps) {
  const config = getStatusConfig(reservation.status)
  const StatusIcon = iconMap[reservation.status] ?? Clock
  const cancellable = canCancelStatus(reservation.status)
  const confirmable = canConfirmStatus(reservation.status)
  const isReady = reservation.status === 'ready_pickup'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass-card border ${
        borderColorMap[reservation.status] ?? 'border-l-gray-500/50'
      } border-l-4 rounded-xl p-3 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium dark:text-white text-gray-900 truncate">{reservation.pack_title}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            {isReady && (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
                Listo para recoger!
              </span>
            )}
          </div>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1 flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            {reservation.customer_display_name}
          </p>
          <p className="text-[10px] dark:text-gray-600 text-gray-400 mt-0.5">
            {formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')}
            {' • '}
            {formatPickupWindow(reservation.pickup_start_at, reservation.pickup_end_at, reservation.timezone)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {confirmable && onConfirmClick && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onConfirmClick(reservation.reservation_id)}
              disabled={updating === reservation.reservation_id}
              className="flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Confirmar
            </Button>
          )}
          {cancellable && onCancelClick && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onCancelClick(reservation.reservation_id)}
              disabled={updating === reservation.reservation_id}
              className="flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
          )}
          <Link href={`/packs/${reservation.pack_id}`} aria-label={`Ver pack ${reservation.pack_title}`}>
            <Eye className="w-4 h-4 text-gray-500 hover:text-primary transition-colors cursor-pointer" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
