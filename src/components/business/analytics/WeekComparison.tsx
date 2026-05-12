'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import type { WeeklyComparison } from './useBusinessAnalytics'

interface Props { comparison: WeeklyComparison }

function ChangeBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
  const bg = value > 0 ? 'bg-green-500/10' : value < 0 ? 'bg-red-500/10' : 'bg-gray-500/10'
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus

  return (
    <div className={`flex items-center gap-1 ${color} ${bg} px-2.5 py-1 rounded-lg text-xs font-bold`}>
      <Icon className="w-3.5 h-3.5" />
      {value > 0 ? '+' : ''}{value}{suffix}
    </div>
  )
}

export default function WeekComparison({ comparison }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-base"
    >
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-white">Comparativa semanal</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Reservas */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Reservas</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-muted/50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Esta semana</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">{comparison.currentWeek.reservations}</span>
                <ChangeBadge value={comparison.reservationChange} />
              </div>
            </div>
            <div className="bg-dark-muted/50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Semana anterior</p>
              <p className="text-2xl font-bold text-gray-400 mt-1">{comparison.lastWeek.reservations}</p>
            </div>
          </div>
        </div>

        {/* Ingresos */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Ingresos</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-dark-muted/50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Esta semana</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-green-400">
                  ${comparison.currentWeek.revenue.toFixed(2)}
                </span>
                <ChangeBadge value={comparison.revenueChange} />
              </div>
            </div>
            <div className="bg-dark-muted/50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Semana anterior</p>
              <p className="text-2xl font-bold text-gray-400 mt-1">${comparison.lastWeek.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
