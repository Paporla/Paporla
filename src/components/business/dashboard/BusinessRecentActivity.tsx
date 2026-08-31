'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShoppingBag, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils/formatDate'
import { getStatusConfig } from '@/lib/constants/reservations'

interface Activity {
  id: string
  type: 'reservation' | 'pack' | 'review'
  title: string
  description: string
  status?: string
  created_at: string
  link?: string
}

interface BusinessRecentActivityProps {
  activities?: Activity[]
}

// Icono por estado canónico (RESERVATION_STATUSES): la etiqueta y el color
// salen de getStatusConfig (lib/constants/reservations), la única fuente de
// verdad del módulo de reservas. Si llega un estado sin icono aquí, la
// tarjeta se pinta sin icono pero SIEMPRE con su etiqueta real (nunca
// "Cancelado" para un estado que no es cancelación, como ocurría antes).
const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  payment_pending: Clock,
  confirmed: CheckCircle,
  ready_pickup: Clock,
  picked_up: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: AlertTriangle,
  expired: XCircle,
}

export default function BusinessRecentActivity({ activities = [] }: BusinessRecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <ShoppingBag className="w-12 h-12 dark:text-gray-600 text-gray-300 mx-auto mb-3" />
        <p className="dark:text-gray-400 text-gray-600">No hay actividad reciente</p>
        <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">Las nuevas reservas apareceran aqui</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 border-b border-dark-border dark:border-gray-200">
        <div>
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Actividad reciente</h3>
          <p className="text-xs dark:text-gray-500 text-gray-500">Ultimas reservas y movimientos</p>
        </div>
        <Link href="/business/reservations" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Ver todas →
        </Link>
      </div>

      <div className="divide-y divide-dark-border">
        {activities.slice(0, 5).map((activity, idx) => {
          const statusConfig = activity.status ? getStatusConfig(activity.status) : null
          const StatusIcon = activity.status ? statusIcons[activity.status] : null

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-4 p-4 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                    {activity.title}
                  </p>
                  {StatusIcon && <StatusIcon className={`w-3 h-3 ${statusConfig?.color ?? ''}`} />}
                  {statusConfig && <span className="text-[10px] text-gray-500">{statusConfig.label}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                <p className="text-[10px] text-gray-600 mt-1">{formatRelativeDate(activity.created_at)}</p>
              </div>
              {activity.link && (
                <Link href={activity.link}>
                  <Eye className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors cursor-pointer" />
                </Link>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
