'use client'

import { motion } from 'framer-motion'
import { Bell, UserPlus, Store, AlertTriangle, ShoppingBag } from 'lucide-react'
import NotificationList from '@/components/notifications/NotificationList'

const typeCounts = {
  new_user: { icon: UserPlus, label: 'Nuevos usuarios', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  new_shop: { icon: Store, label: 'Nuevos comercios', color: 'text-primary', bg: 'bg-primary/10' },
  incidence: { icon: AlertTriangle, label: 'Incidencias', color: 'text-red-400', bg: 'bg-red-500/10' },
  new_reservation: { icon: ShoppingBag, label: 'Nuevas reservas', color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export default function AdminNotificationsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="section-header -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Notificaciones</h1>
            <p className="text-gray-400 text-sm mt-1">Actividad del sistema en tiempo real</p>
          </div>
        </div>
      </div>

      {/* Leyenda de tipos */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeCounts).map(([type, config]) => (
          <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
            <config.icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          </div>
        ))}
      </div>

      <NotificationList />
    </motion.div>
  )
}
