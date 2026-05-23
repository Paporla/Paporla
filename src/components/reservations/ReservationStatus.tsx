'use client'

import { motion } from 'framer-motion'
import { STATUS_CONFIG } from '@/lib/constants/reservations'

export type ReservationStatusType =
  | 'pending'
  | 'confirmed'
  | 'ready_pickup'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired'

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Esperando confirmacion del comercio',
  confirmed: 'Pago confirmado. Espera la hora de recogida',
  ready_pickup: 'Tu pack esta listo! Pasa a recogerlo',
  completed: 'Gracias por recoger tu pack!',
  cancelled: 'Reserva cancelada',
  no_show: 'No recogiste el pack a tiempo',
  expired: 'El tiempo para recoger ha expirado',
}

interface ReservationStatusProps {
  status: ReservationStatusType
  pickupCode?: string
  pickupDate?: string | null
  pickupStartTime?: string | null
  pickupEndTime?: string | null
}

export default function ReservationStatus({
  status,
  pickupCode,
  pickupDate,
  pickupStartTime,
  pickupEndTime,
}: ReservationStatusProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const message = STATUS_MESSAGES[status] || ''
  const colorClass = `${config.bg} ${config.color}`

  const pickupTime =
    pickupStartTime && pickupEndTime ? `${pickupStartTime.slice(0, 5)} - ${pickupEndTime.slice(0, 5)}` : null

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${colorClass}`}>
        <span className="font-semibold">{config.label}</span>
      </div>

      <p className="dark:text-gray-400 text-gray-600">{message}</p>

      {/* Horario de recogida */}
      {(pickupDate || pickupTime) && status === 'ready_pickup' && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm dark:text-gray-400 text-gray-600">Recoge tu pack:</p>
          {pickupDate && (
            <p className="dark:text-white text-gray-900 font-medium">{new Date(pickupDate).toLocaleDateString()}</p>
          )}
          {pickupTime && <p className="text-primary font-bold">{pickupTime}</p>}
        </div>
      )}

      {/* Codigo de recogida */}
      {pickupCode && (status === 'confirmed' || status === 'ready_pickup') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg text-center"
        >
          <p className="text-sm dark:text-gray-400 text-gray-600 mb-1">Codigo de recogida</p>
          <p className="text-3xl font-bold text-primary tracking-wider font-mono">{pickupCode}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">Presenta este codigo al recoger tu pedido</p>
        </motion.div>
      )}

      {/* Advertencia de expiracion */}
      {status === 'confirmed' && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">La reserva esta pendiente de confirmacion por el comercio</p>
        </div>
      )}

      {status === 'confirmed' && pickupDate && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">Recuerda: Puedes cancelar hasta 2 horas antes de la recogida</p>
        </div>
      )}
    </motion.div>
  )
}
