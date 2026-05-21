'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '@/components/ui/Card'
import { ChartTooltip } from './ChartTooltip'

type TimeRange = '7d' | '30d' | 'all'

interface Props { data: Array<{ day: string; registrations: number }> }

export default function StatsUserChart({ data }: Props) {
  const [range, setRange] = useState<TimeRange>('30d')
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 30
  const filtered = range === 'all' ? data : data.slice(-days)

  return (
    <Card glass className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Registros de Usuarios</h3>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">Ultimos {range === 'all' ? '30' : days} dias</p>
        </div>
        <div className="flex gap-1 dark:bg-white/5 bg-gray-100 rounded-lg p-0.5">
          {(['7d', '30d', 'all'] as TimeRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-all ${range === r ? 'bg-primary text-black' : 'dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900'}`}>
              {r === '7d' ? '7D' : r === '30d' ? '30D' : 'Todo'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={filtered}>
          <defs>
            <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#27d3b8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#27d3b8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey="day" stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#27d3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="registrations" stroke="#27d3b8" strokeWidth={2} fill="url(#userGradient)" name="Registros" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
