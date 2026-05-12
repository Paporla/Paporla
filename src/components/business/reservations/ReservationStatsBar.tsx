'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, CheckCircle, Ban, XCircle, DollarSign } from 'lucide-react'
import Card from '@/components/ui/Card'

interface Stats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
  totalRevenue: number
}

interface Props {
  stats: Stats
}

const statItems = [
  { key: 'total', label: 'Total', color: 'text-primary', icon: ShoppingBag },
  { key: 'pending', label: 'Pendientes', color: 'text-yellow-400', icon: Clock },
  { key: 'confirmed', label: 'Confirmadas', color: 'text-blue-400', icon: CheckCircle },
  { key: 'completed', label: 'Retiradas', color: 'text-green-400', icon: CheckCircle },
  { key: 'noShow', label: 'No retiradas', color: 'text-gray-400', icon: Ban },
  { key: 'cancelled', label: 'Canceladas', color: 'text-red-400', icon: XCircle },
  { key: 'revenue', label: 'Ingresos', color: 'text-primary', icon: DollarSign },
] as const

export default function ReservationStatsBar({ stats }: Props) {
  const getValue = (key: string) => {
    if (key === 'revenue') return `$${(stats.totalRevenue / 100).toLocaleString()}`
    return stats[key as keyof Stats]
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {statItems.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Card glass className="p-3 text-center">
            <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
            <p className={`text-lg font-bold ${item.color}`}>{getValue(item.key)}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
