'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Package, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import type { AdminDashboardStats } from './useAdminDashboard'

interface Props {
  stats: AdminDashboardStats
  loading?: boolean
  error?: string
}

const items: Array<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  key: keyof AdminDashboardStats
  color: string
  bg: string
}> = [
  { icon: Package, label: 'Packs Creados', key: 'totalPacks', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Calendar, label: 'Reservas', key: 'totalReservations', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: CheckCircle, label: 'Verificados', key: 'verifiedShops', color: 'text-green-400', bg: 'bg-green-500/10' },
  { icon: XCircle, label: 'Baneados', key: 'bannedShops', color: 'text-red-400', bg: 'bg-red-500/10' },
]

export default function AdminStatCards({ stats, loading, error }: Props) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  const getValue = (key: keyof AdminDashboardStats): number => {
    return stats?.[key] ?? 0
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.05 }}
        >
          <Card glass className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${item.color}`}>{getValue(item.key).toLocaleString()}</div>
                <div className="text-xs dark:text-gray-400 text-gray-700 mt-1">{item.label}</div>
              </div>
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
