'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface DataPoint {
  date: string
  value: number
}

interface ReservationChartProps {
  data: DataPoint[]
  title?: string
  trend?: number
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-xl">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-primary">
          {payload[0].value} {payload[0].value === 1 ? 'reserva' : 'reservas'}
        </p>
      </div>
    )
  }
  return null
}

export default function ReservationChart({ data, title = 'Reservas', trend = 0 }: ReservationChartProps) {
  const isPositive = trend >= 0
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-bold dark:text-white text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="dark:text-gray-500 text-gray-400 text-sm">No hay datos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-bold dark:text-white text-gray-900">{title}</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold dark:text-white text-gray-900">{total}</span>
            <span className="text-sm dark:text-gray-500 text-gray-400">total</span>
            {trend !== 0 && (
              <div
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}
                {trend}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#00ff88" radius={[6, 6, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
