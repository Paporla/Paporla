'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, User, Calendar, Ban, Eye, Phone } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import { STATUS_CONFIG, isActiveStatus } from '@/lib/constants/reservations'
import type { ReservationItem } from './useBusinessReservations'

interface ReservationCardProps {
  reservation: ReservationItem
  index: number
  updating: string | null
  onValidate?: (id: string) => void
  onNoShow?: (id: string) => void
  onCancelClick?: (id: string) => void
  compact?: boolean
}

export default function ReservationCard({
  reservation,
  index,
  updating,
  onValidate,
  onNoShow,
  onCancelClick,
  compact = false,
}: ReservationCardProps) {
  const sharedConfig = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconMap: Record<string, any> = {
    pending: Clock,
    confirmed: CheckCircle,
    ready_pickup: Clock,
    picked_up: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    no_show: Ban,
  }
  const StatusIcon = iconMap[reservation.status] || Clock
  const borderColorMap: Record<string, string> = {
    pending: 'border-l-yellow-500/50',
    confirmed: 'border-l-blue-500/50',
    ready_pickup: 'border-l-primary',
    picked_up: 'border-l-green-500/50',
    completed: 'border-l-green-500/50',
    cancelled: 'border-l-red-500/50',
    no_show: 'border-l-gray-500/50',
  }
  const config = { ...sharedConfig, borderColor: borderColorMap[reservation.status] || 'border-l-gray-500/50' }
  const active = isActiveStatus(reservation.status)
  const showCode = ['pending', 'confirmed', 'ready_pickup'].includes(reservation.status)
  const isReady = reservation.status === 'ready_pickup'

  // Versión compacta (para grupos)
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`bg-dark-card dark:bg-white border ${config.borderColor} border-l-4 rounded-xl p-3 dark:hover:bg-gray-50 hover:bg-gray-50 transition-colors`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium dark:text-white text-gray-900 truncate">{reservation.pack.title}</p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-1 flex items-center gap-1">
              <User className="w-3 h-3" />
              {reservation.user.name}
            </p>
            <p className="text-[10px] dark:text-gray-600 text-gray-400 mt-0.5">
              {formatPrice(reservation.total_price_cents)} • {reservation.quantity}x
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showCode && reservation.pickup_code && (
              <div className="hidden sm:block">
                <p className="text-[10px] text-gray-500">Código</p>
                <p className="text-xs font-bold text-primary font-mono">{reservation.pickup_code}</p>
              </div>
            )}
            <Link href={`/packs/${reservation.pack.id}`}>
              <Eye className="w-4 h-4 text-gray-500 hover:text-primary transition-colors cursor-pointer" />
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  // Versión completa (original)
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Card glass hover className={`p-5 group border-l-4 ${config.borderColor}`}>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Columna izquierda - Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                {reservation.pack.title}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
              {isReady && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
                  Listo para recoger!
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm dark:text-gray-300 text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 dark:text-gray-500 text-gray-400" />
                {reservation.user.name} ({reservation.user.email})
              </p>
              {reservation.user.phone && (
                <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {reservation.user.phone}
                </p>
              )}
              <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {formatDate(reservation.created_at)}
              </p>
              <p className="text-sm text-primary font-semibold">
                {reservation.quantity}x • {formatPrice(reservation.total_price_cents)}
              </p>
            </div>

            {showCode && reservation.pickup_code && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <p className="text-lg font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
                  <CopyButton text={reservation.pickup_code} label="Copiar" />
                </div>
                {reservation.pickup_date && reservation.pickup_end_time && (
                  <div className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recoge antes de: {new Date(reservation.pickup_date).toLocaleDateString()}{' '}
                    {reservation.pickup_end_time?.slice(0, 5)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna derecha - Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            {active && onValidate && (
              <Button
                size="sm"
                onClick={() => onValidate(reservation.id)}
                disabled={updating === reservation.id}
                className="flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" /> Validar
              </Button>
            )}
            {active && onNoShow && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNoShow(reservation.id)}
                disabled={updating === reservation.id}
                className="flex items-center gap-1 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:border-gray-600 border-gray-300"
              >
                <Ban className="w-4 h-4" /> No retiro
              </Button>
            )}
            {active && onCancelClick && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onCancelClick(reservation.id)}
                disabled={updating === reservation.id}
                className="flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> Cancelar
              </Button>
            )}
            <Link href={`/packs/${reservation.pack.id}`}>
              <Button variant="outline" size="sm" className="p-2">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {active && reservation.pickup_start_time && reservation.pickup_end_time && (
          <div className="mt-3 pt-3 border-t border-dark-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Ventana de recogida</span>
              <span className="text-primary font-mono">
                {reservation.pickup_start_time.slice(0, 5)} - {reservation.pickup_end_time.slice(0, 5)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
