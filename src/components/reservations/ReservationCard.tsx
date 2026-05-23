'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import type { ReservationWithDetails } from '@/types/reservation'
import { STATUS_CONFIG, STATUS_LABELS, isActiveStatus, canCancelStatus } from '@/lib/constants/reservations'

interface ReservationCardProps {
  reservation: ReservationWithDetails
  onCancel?: (id: string) => void
  onConfirm?: (id: string) => void
  onComplete?: (id: string) => void
  showUserDetails?: boolean
}

export default function ReservationCard({
  reservation,
  onCancel,
  onConfirm,
  onComplete,
  showUserDetails = false,
}: ReservationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const status = reservation.status
  const colors = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  const pickupTime =
    reservation.pickup_start_time && reservation.pickup_end_time
      ? `${reservation.pickup_start_time.slice(0, 5)} - ${reservation.pickup_end_time.slice(0, 5)}`
      : null

  const active = isActiveStatus(status)
  const canCancel = canCancelStatus(status)
  const canConfirm = false
  const canComplete = status === 'confirmed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`dark:bg-dark-card bg-white border ${colors.border} rounded-2xl overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.color}`}>
              {STATUS_LABELS[status] || status}
            </span>
            {active && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Activa
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="dark:text-gray-500 text-gray-400 hover:text-primary transition-colors"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <h3 className="font-bold dark:text-white text-gray-900 mt-2">{reservation.pack.title}</h3>
        <p className="text-sm dark:text-gray-400 text-gray-600">{reservation.shop.name}</p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-black text-primary">{formatPrice(reservation.total_price_cents)}</span>
          <span className="text-xs dark:text-gray-500 text-gray-400">Cantidad: {reservation.quantity || 1}</span>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4 space-y-3 border-t dark:border-dark-border border-gray-200 pt-3"
        >
          {/* Codigo de recogida */}
          {reservation.pickup_code && active && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] dark:text-gray-500 text-gray-400 uppercase">Codigo de recogida</p>
                <p className="text-lg font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
              </div>
              <CopyButton text={reservation.pickup_code} label="Copiar" />
            </div>
          )}

          {/* Fecha y hora */}
          {(reservation.pickup_date || pickupTime) && (
            <div className="space-y-2">
              {reservation.pickup_date && (
                <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDate(reservation.pickup_date)}</span>
                </div>
              )}
              {pickupTime && (
                <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{pickupTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Direccion */}
          {reservation.shop.address && (
            <div className="flex items-start gap-2 text-sm dark:text-gray-400 text-gray-600">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{reservation.shop.address}</span>
            </div>
          )}

          {/* Datos del usuario (para vista comercio) */}
          {showUserDetails && reservation.user && (
            <div className="dark:bg-dark-muted bg-gray-100 rounded-xl p-3 space-y-1">
              <p className="text-xs dark:text-gray-500 text-gray-400 uppercase">Datos del cliente</p>
              <p className="text-sm dark:text-white text-gray-900">{reservation.user.name || 'Usuario'}</p>
              <p className="text-xs dark:text-gray-400 text-gray-600">{reservation.user.email}</p>
              {reservation.user.phone && (
                <p className="text-xs dark:text-gray-400 text-gray-600">{reservation.user.phone}</p>
              )}
            </div>
          )}

          {/* Botones de accion */}
          <div className="flex gap-2 pt-2">
            {canConfirm && onConfirm && (
              <Button size="sm" onClick={() => onConfirm(reservation.id)} className="flex-1">
                Confirmar pago
              </Button>
            )}
            {canComplete && onComplete && (
              <Button size="sm" onClick={() => onComplete(reservation.id)} className="flex-1">
                Marcar como recogido
              </Button>
            )}
            {canCancel && onCancel && (
              <Button size="sm" variant="danger" onClick={() => onCancel(reservation.id)} className="flex-1">
                Cancelar
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Fecha de reserva */}
      <div className="px-4 py-2 dark:bg-dark-muted/50 bg-gray-50 text-[10px] dark:text-gray-600 text-gray-400 border-t dark:border-dark-border border-gray-200">
        Reservado el {formatDate(reservation.created_at)}
      </div>
    </motion.div>
  )
}
