'use client'

import { motion } from 'framer-motion'
import { DollarSign, ShoppingBag, CheckCircle, XCircle, Package, TrendingUp } from 'lucide-react'
import type { AnalyticsSummary } from './useBusinessAnalytics'

interface Props { summary: AnalyticsSummary }

export default function AnalyticsSummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'Ingresos totales',
      value: `$${(summary.totalRevenue / 100).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      sub: `${summary.completedReservations} completadas`,
    },
    {
      label: 'Reservas totales',
      value: summary.totalReservations,
      icon: ShoppingBag,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      sub: `${summary.completedReservations} exitosas`,
    },
    {
      label: 'Packs activos',
      value: summary.activePacks,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: `${summary.totalPacksCreated} creados`,
    },
    {
      label: 'Cancelaciones',
      value: summary.cancelledReservations + summary.noShows,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      sub: `${Math.round((summary.cancelledReservations + summary.noShows) / Math.max(summary.totalReservations, 1) * 100)}% del total`,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08 }}
          className="card-base"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">{card.label}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}
