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

const statItems = [
  {
    key: 'activeReservations',
    label: 'Reservas activas',
    icon: Calendar,
    color: 'text-primary',
    bg: 'bg-primary/10',
    link: '/reservations',
    suffix: '',
  },
  {
    key: 'totalPacksRescued',
    label: 'Packs rescatados',
    icon: Package,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    link: '/reservations',
    suffix: '',
  },
  {
    key: 'co2Saved',
    label: 'CO₂ evitado',
    icon: Leaf,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    link: '/dashboard',
    suffix: 'kg',
  },
  {
    key: 'moneySaved',
    label: 'Ahorrado',
    icon: DollarSign,
    color: 'text-primary',
    bg: 'bg-primary/10',
    link: '/dashboard',
    suffix: '',
    isPrice: true,
  },
]

export default function UserStatsGrid({ stats, loading, error }: UserStatsGridProps) {
  // Estado de error
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    )
  }

  // Estado de carga — skeleton cards
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 rounded-2xl p-4 animate-pulse"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-600 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const getValue = (key: string, isPrice?: boolean, suffix?: string) => {
    const value = stats ? stats[key as keyof UserStats] : 0
    if (isPrice && typeof value === 'number') {
      return `$${value.toLocaleString()}`
    }
    if (suffix && typeof value === 'number') {
      return `${value}${suffix}`
    }
    return value ?? 0
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Link href={item.link}>
            <div className="group dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 hover:border-primary/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className={`p-2 rounded-xl ${item.bg} inline-flex mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>{getValue(item.key, item.isPrice, item.suffix)}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              <div className="mt-2 text-[10px] text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalles →
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
