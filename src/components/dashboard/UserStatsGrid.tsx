'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, Package, Leaf, DollarSign, AlertCircle } from 'lucide-react'

interface UserStats {
  activeReservations: number
  totalPacksRescued: number
  co2Saved: number
  moneySaved: number
  points?: number
  level?: string
}

interface UserStatsGridProps {
  stats: UserStats
  loading?: boolean
  error?: string
}

export default function UserStatsGrid({ stats, loading, error }: UserStatsGridProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-600 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const items = [
    {
      key: 'activeReservations',
      label: 'Reservas activas',
      value: stats.activeReservations,
      icon: Calendar,
      color: 'text-primary',
      bg: 'bg-primary/10',
      link: '/reservations',
    },
    {
      key: 'totalPacksRescued',
      label: 'Packs rescatados',
      value: stats.totalPacksRescued,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      key: 'co2Saved',
      label: 'CO₂ evitado',
      value: `${stats.co2Saved}kg`,
      icon: Leaf,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      key: 'moneySaved',
      label: 'Ahorrado',
      value: `$${stats.moneySaved.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => {
        const content = (
          <div className="group glass-card hover:border-primary/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className={`p-2 rounded-xl ${item.bg} inline-flex mb-3 group-hover:scale-110 transition-transform`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            <div className="mt-2 text-[10px] text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity h-[15px]">
              {'link' in item ? 'Ver detalles →' : ''}
            </div>
          </div>
        )

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {'link' in item && item.link ? <Link href={item.link}>{content}</Link> : content}
          </motion.div>
        )
      })}
    </div>
  )
}
