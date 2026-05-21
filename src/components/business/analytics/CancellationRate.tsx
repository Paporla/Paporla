'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import type { CancellationData } from './useBusinessAnalytics'

interface Props { data: CancellationData }

const COLORS = {
  completed: '#00ff88',
  cancelled: '#ff6b6b',
  noShow: '#ff8a3c',
  expired: '#666666',
}

export default function CancellationRate({ data }: Props) {
  const total = data.completed + data.cancelled + data.noShow + data.expired
  if (total === 0) return null

  const chartData = [
    { name: 'Completadas', value: data.completed, color: COLORS.completed },
    { name: 'Canceladas', value: data.cancelled, color: COLORS.cancelled },
    { name: 'No retiradas', value: data.noShow, color: COLORS.noShow },
    { name: 'Expiradas', value: data.expired, color: COLORS.expired },
  ].filter(d => d.value > 0)

  const successRate = Math.round((data.completed / total) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="card-base"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold dark:text-white text-gray-900">Tasa de exito</h3>
        </div>
        <div className={`text-2xl font-bold ${successRate >= 80 ? 'text-green-400' : successRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
          {successRate}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', color: '#fff', fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} (${Math.round(value / total * 100)}%)`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center space-y-3">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm dark:text-gray-400 text-gray-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium dark:text-white text-gray-900">{item.value}</span>
                <span className="text-xs dark:text-gray-500 text-gray-400">({Math.round(item.value / total * 100)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
