'use client'

import { motion } from 'framer-motion'

export type ReservationStatusType = 
  | 'pending' 
  | 'confirmed' 
  | 'ready_pickup' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'expired'

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
  pickupEndTime 
}: ReservationStatusProps) {
  const config = {
    pending: {
      label: 'Pendiente',
      color: 'bg-yellow-500/20 text-yellow-400',
      icon: '⏳',
      message: 'Esperando confirmación del comercio'
    },
    confirmed: {
      label: 'Confirmada',
      color: 'bg-blue-500/20 text-blue-400',
      icon: '💰',
      message: 'Pago confirmado. Espera la hora de recogida'
    },
    ready_pickup: {
      label: 'Lista para recoger',
      color: 'bg-primary/20 text-primary',
      icon: '📦',
      message: '¡Tu pack está listo! Pasa a recogerlo'
    },
    completed: {
      label: 'Completada',
      color: 'bg-green-500/20 text-green-400',
      icon: '🎉',
      message: '¡Gracias por recoger tu pack!'
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-500/20 text-red-400',
      icon: '❌',
      message: 'Reserva cancelada'
    },
    no_show: {
      label: 'No retirada',
      color: 'bg-gray-500/20 text-gray-400',
      icon: '😔',
      message: 'No recogiste el pack a tiempo'
    },
    expired: {
      label: 'Expirada',
      color: 'bg-orange-500/20 text-orange-400',
      icon: '⏰',
      message: 'El tiempo para recoger ha expirado'
    }
  }

  const current = config[status] || config.pending

  const pickupTime = pickupStartTime && pickupEndTime
    ? `${pickupStartTime.slice(0,5)} - ${pickupEndTime.slice(0,5)}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${current.color}`}>
        <span className="text-lg">{current.icon}</span>
        <span className="font-semibold">{current.label}</span>
      </div>

      <p className="text-gray-400">{current.message}</p>

      {/* Horario de recogida */}
      {(pickupDate || pickupTime) && status === 'ready_pickup' && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-gray-400">Recoge tu pack:</p>
          {pickupDate && (
            <p className="text-white font-medium">
              {new Date(pickupDate).toLocaleDateString()}
            </p>
          )}
          {pickupTime && (
            <p className="text-primary font-bold">{pickupTime}</p>
          )}
        </div>
      )}

      {/* Código de recogida */}
      {pickupCode && (status === 'confirmed' || status === 'ready_pickup') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg text-center"
        >
          <p className="text-sm text-gray-400 mb-1">Código de recogida</p>
          <p className="text-3xl font-bold text-primary tracking-wider font-mono">{pickupCode}</p>
          <p className="text-xs text-gray-500 mt-2">Presenta este código al recoger tu pedido</p>
        </motion.div>
      )}

      {/* Advertencia de expiración */}
      {status === 'pending' && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ La reserva está pendiente de confirmación por el comercio
          </p>
        </div>
      )}

      {status === 'confirmed' && pickupDate && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            💡 Recuerda: Puedes cancelar hasta 2 horas antes de la recogida
          </p>
        </div>
      )}
    </motion.div>
  )
}