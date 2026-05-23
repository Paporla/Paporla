'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react'

interface ReservationStatsProps {
  total: number
  active: number
  completed: number
  cancelled: number
}

export default function ReservationStats({ total, active, completed, cancelled }: ReservationStatsProps) {
  const stats = [
    { label: 'Total reservas', value: total, icon: ShoppingBag, color: 'text-primary' },
    { label: 'Activas', value: active, icon: Clock, color: 'text-yellow-400' },
    { label: 'Completadas', value: completed, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Canceladas', value: cancelled, icon: XCircle, color: 'text-red-400' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-dark-card border border-dark-border rounded-xl p-4 text-center"
        >
          <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
          <p className="text-2xl font-black text-white">{stat.value}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
