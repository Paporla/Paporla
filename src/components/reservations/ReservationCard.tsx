'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import type { ReservationWithDetails } from '@/types/reservation'

type ReservationStatus = 'pending' | 'confirmed' | 'ready_pickup' | 'completed' | 'cancelled' | 'no_show' | 'expired'

interface ReservationCardProps {
  reservation: ReservationWithDetails
  onCancel?: (id: string) => void
  onConfirm?: (id: string) => void
  onComplete?: (id: string) => void
  showUserDetails?: boolean
}

const statusColors: Record<ReservationStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  ready_pickup: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  no_show: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  expired: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
}

const statusLabels: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  ready_pickup: 'Lista para recoger',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No retirada',
  expired: 'Expirada',
}

export default function ReservationCard({ 
  reservation, 
  onCancel, 
  onConfirm,
  onComplete,
  showUserDetails = false 
}: ReservationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const status = reservation.status as ReservationStatus
  const colors = statusColors[status] || statusColors.pending

  const pickupTime = reservation.pickup_start_time && reservation.pickup_end_time
    ? `${reservation.pickup_start_time.slice(0,5)} - ${reservation.pickup_end_time.slice(0,5)}`
    : null

  const isActive = ['confirmed', 'pending'].includes(status)
  const canCancel = ['confirmed', 'pending'].includes(status)
  const canConfirm = false // Auto-confirmado en demo
  const canComplete = status === 'confirmed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-dark-card border ${colors.border} rounded-2xl overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {statusLabels[status]}
            </span>
            {isActive && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Activa
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-primary transition-colors"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <h3 className="font-bold text-white mt-2">{reservation.pack.title}</h3>
        <p className="text-sm text-gray-400">{reservation.shop.name}</p>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-black text-primary">
            {formatPrice(reservation.total_price_cents)}
          </span>
          <span className="text-xs text-gray-500">
            Cantidad: {reservation.quantity || 1}
          </span>
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4 space-y-3 border-t border-dark-border pt-3"
        >
          {/* Código de recogida */}
          {reservation.pickup_code && isActive && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Código de recogida</p>
                <p className="text-lg font-bold text-primary tracking-wider font-mono">
                  {reservation.pickup_code}
                </p>
              </div>
              <CopyButton text={reservation.pickup_code} label="Copiar" />
            </div>
          )}

          {/* Fecha y hora */}
          {(reservation.pickup_date || pickupTime) && (
            <div className="space-y-2">
              {reservation.pickup_date && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDate(reservation.pickup_date)}</span>
                </div>
              )}
              {pickupTime && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{pickupTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Dirección */}
          {reservation.shop.address && (
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{reservation.shop.address}</span>
            </div>
          )}

          {/* Datos del usuario (para vista comercio) */}
          {showUserDetails && reservation.user && (
            <div className="bg-dark-muted rounded-xl p-3 space-y-1">
              <p className="text-xs text-gray-500 uppercase">Datos del cliente</p>
              <p className="text-sm text-white">{reservation.user.name || 'Usuario'}</p>
              <p className="text-xs text-gray-400">{reservation.user.email}</p>
              {reservation.user.phone && (
                <p className="text-xs text-gray-400">📞 {reservation.user.phone}</p>
              )}
            </div>
          )}

          {/* Botones de acción */}
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
              <Button 
                size="sm" 
                variant="danger" 
                onClick={() => onCancel(reservation.id)}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Fecha de reserva */}
      <div className="px-4 py-2 bg-dark-muted/50 text-[10px] text-gray-600 border-t border-dark-border">
        Reservado el {formatDate(reservation.created_at)}
      </div>
    </motion.div>
  )
}