'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, CheckCircle, Ban, XCircle, DollarSign, Calendar } from 'lucide-react'
import Card from '@/components/ui/Card'

interface Stats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
  totalRevenue: number
  todayCount?: number
}

interface ReservationStatsBarProps {
  stats: Stats
}

const statItems = [
  { key: 'todayCount', label: 'Hoy', color: 'text-primary', icon: Calendar, bg: 'bg-primary/10' },
  { key: 'total', label: 'Total', color: 'text-blue-400', icon: ShoppingBag, bg: 'bg-blue-500/10' },
  { key: 'pending', label: 'Pendientes', color: 'text-yellow-400', icon: Clock, bg: 'bg-yellow-500/10' },
  { key: 'confirmed', label: 'Confirmadas', color: 'text-cyan-400', icon: CheckCircle, bg: 'bg-cyan-500/10' },
  { key: 'completed', label: 'Completadas', color: 'text-green-400', icon: CheckCircle, bg: 'bg-green-500/10' },
  { key: 'noShow', label: 'No retiradas', color: 'text-gray-400', icon: Ban, bg: 'bg-gray-500/10' },
  { key: 'cancelled', label: 'Canceladas', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10' },
  { key: 'revenue', label: 'Ingresos', color: 'text-primary', icon: DollarSign, bg: 'bg-primary/10', isPrice: true },
]

export default function ReservationStatsBar({ stats }: ReservationStatsBarProps) {
  const getValue = (key: string, _isPrice?: boolean) => {
    if (key === 'revenue') {
      return `$${(stats.totalRevenue / 100).toLocaleString()}`
    }
    if (key === 'todayCount') {
      return stats.todayCount ?? 0
    }
    return stats[key as keyof Stats]
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {statItems.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Card glass className="p-3 text-center">
            <div className={`p-1.5 rounded-lg ${item.bg} inline-flex mx-auto mb-2`}>
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            </div>
            <p className={`text-lg font-bold ${item.color}`}>{getValue(item.key, item.isPrice)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
