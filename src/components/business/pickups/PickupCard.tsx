'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clock, Package, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatPickupWindow } from '@/lib/utils/formatDate'

/**
 * "Ahora" para el badge "En horario": se calcula una vez al montar y se
 * refresca cada 30 s (el estado nunca se calcula durante el render, lo que
 * mantiene el componente puro).
 */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * Fila de recogida para "Recogidas de hoy". Subconjunto de la fila canónica
 * de list_shop_reservations (0014:333). Solo lectura: el código NO va aquí
 * (se emite una sola vez al confirmar, 0031) y no hay acciones por tarjeta:
 * la validación siempre es por código, en el validador.
 */
export interface PickupItem {
  reservation_id: string
  pack_title: string
  customer_display_name: string
  /** 'ready_pickup' o 'confirmed' (los únicos estados que aparecen aquí). */
  status: string
  pickup_start_at: string | null
  pickup_end_at: string | null
  timezone: string
}

interface Props {
  pickup: PickupItem
  index: number
}

export default function PickupCard({ pickup, index }: Props) {
  const now = useNow(30_000)
  const start = pickup.pickup_start_at ? new Date(pickup.pickup_start_at).getTime() : null
  const end = pickup.pickup_end_at ? new Date(pickup.pickup_end_at).getTime() : null
  const inWindow = start !== null && end !== null && now >= start && now <= end
  const isReady = pickup.status === 'ready_pickup'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`border rounded-xl p-4 ${
        inWindow
          ? 'border-primary/40 dark:bg-primary/5'
          : 'dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-semibold dark:text-white text-gray-900">{pickup.customer_display_name}</span>
        {inWindow && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> En horario
          </span>
        )}
        {isReady ? (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Listo para recoger
          </span>
        ) : (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Aguardando su ventana
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600 mt-1.5">
        <Package className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{pickup.pack_title}</span>
        <span className="text-xs dark:text-gray-500 text-gray-400 ml-auto whitespace-nowrap">
          {formatPickupWindow(pickup.pickup_start_at, pickup.pickup_end_at, pickup.timezone)}
        </span>
      </div>
    </motion.div>
  )
}
