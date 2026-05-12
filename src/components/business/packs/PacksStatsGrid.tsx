'use client'

import { motion } from 'framer-motion'
import { Package, CheckCircle, EyeOff, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'

interface PacksStats {
  total: number
  active: number
  inactive: number
  lowStock: number
}

interface Props {
  stats: PacksStats
}

const items = [
  { key: 'total', label: 'Total packs', icon: Package, color: 'text-primary' },
  { key: 'active', label: 'Activos', icon: CheckCircle, color: 'text-green-400' },
  { key: 'inactive', label: 'Inactivos', icon: EyeOff, color: 'text-gray-400' },
  { key: 'lowStock', label: 'Stock bajo', icon: AlertCircle, color: 'text-yellow-400' },
] as const

export default function PacksStatsGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card glass className="p-4 text-center">
            <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${item.color}`}>{stats[item.key]}</p>
            <p className="text-xs text-gray-400">{item.label}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
