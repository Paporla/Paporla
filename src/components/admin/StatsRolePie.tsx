'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '@/components/ui/Card'
import { ChartTooltip } from './ChartTooltip'

const COLORS = ['#27d3b8', '#ff8a3c', '#8b5cf6', '#3b82f6']

interface Props {
  data: Array<{ name: string; value: number }>
}

export default function StatsRolePie({ data }: Props) {
  return (
    <Card glass className="p-6">
      <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-6">Distribucion por Rol</h3>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              animationBegin={200}
              animationDuration={1000}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            <span className="dark:text-gray-400 text-gray-600">{d.name}</span>
            <span className="dark:text-white text-gray-900 font-medium ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
