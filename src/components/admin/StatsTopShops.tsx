'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '@/components/ui/Card'
import { ChartTooltip } from './ChartTooltip'
import { Calendar, UserCheck } from 'lucide-react'

interface Props { data: Array<{ name: string; reservations: number }> }

export default function StatsTopShops({ data }: Props) {
  return (
    <Card glass className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Top 5 Comercios</h3>
          <p className="text-xs text-gray-500 mt-0.5">Con mas reservas</p>
        </div>
        {data.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg">
            <UserCheck className="w-3.5 h-3.5" />
            Total: {data.reduce((s, d) => s + d.reservations, 0)} reservas
          </div>
        )}
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
            <XAxis type="number" stroke="#333" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis dataKey="name" type="category" stroke="#333" fontSize={11} tickLine={false} axisLine={false} width={120} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff8a3c" /><stop offset="100%" stopColor="#27d3b8" />
              </linearGradient>
            </defs>
            <Bar dataKey="reservations" fill="url(#barGradient)" radius={[0, 6, 6, 0]} name="Reservas" animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay datos suficientes</p>
          <p className="text-xs text-gray-600 mt-1">Las estadisticas apareceran cuando haya reservas</p>
        </div>
      )}
    </Card>
  )
}
