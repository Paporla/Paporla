'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueData {
  month: string
  total_revenue_cents: number
  total_commissions_cents: number
  total_reservations: number
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: { value: number; payload: RevenueData }[]
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="dark:bg-black/90 bg-white/90 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-xl p-3 shadow-xl">
        <p className="text-sm font-semibold dark:text-white text-gray-900 mb-2">{payload[0].payload.month}</p>
        <p className="text-xs text-primary">
          Ingresos: <span className="font-bold">${(payload[0].value / 100).toLocaleString()}</span>
        </p>
        <p className="text-xs text-violet-400">
          Comisiones: <span className="font-bold">${(payload[1].value / 100).toLocaleString()}</span>
        </p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
          Reservas: {payload[0].payload.total_reservations}
        </p>
      </div>
    )
  }
  return null
}

export default function RevenueChart() {
  const supabase = supabaseBrowser()
  const [data, setData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)

  useEffect(() => {
    const loadRevenueData = async () => {
      setLoading(true)

      const { data, error } = await supabase.from('revenue_metrics').select('*').order('month', { ascending: true })

      if (error) {
        console.error('Error loading revenue data:', error)
      } else if (data && data.length > 0) {
        // Formatear meses
        const formattedData = data.map((item: RevenueData) => ({
          ...item,
          month: new Date(item.month).toLocaleDateString('es', { month: 'short' }),
          total_revenue_cents: item.total_revenue_cents || 0,
          total_commissions_cents: item.total_commissions_cents || 0,
        }))
        setData(formattedData)

        // Calcular total de ingresos
        const total = formattedData.reduce((sum, item) => sum + item.total_revenue_cents, 0)
        setTotalRevenue(total)

        // Calcular crecimiento (comparar últimos 2 meses)
        if (formattedData.length >= 2) {
          const lastMonth = formattedData[formattedData.length - 1].total_revenue_cents
          const prevMonth = formattedData[formattedData.length - 2].total_revenue_cents
          if (prevMonth > 0) {
            const growthPercent = ((lastMonth - prevMonth) / prevMonth) * 100
            setGrowth(Math.round(growthPercent))
          }
        }
      }
      setLoading(false)
    }

    loadRevenueData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 dark:bg-gray-800 bg-gray-200 rounded" />
          <div className="h-4 w-48 dark:bg-gray-800 bg-gray-200 rounded" />
          <div className="h-64 dark:bg-gray-800 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 text-center">
        <p className="dark:text-gray-500 text-gray-400 text-sm">No hay datos de ingresos disponibles</p>
        <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">
          Los datos se mostraran cuando haya reservas completadas
        </p>
      </div>
    )
  }

  return (
    <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Ingresos mensuales</h3>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Comisiones generadas</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="dark:text-gray-500 text-gray-400">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-violet-500" />
            <span className="dark:text-gray-500 text-gray-400">Comisiones (10%)</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-3xl font-black dark:text-white text-gray-900">
          ${(totalRevenue / 100).toLocaleString()}
        </span>
        {growth !== 0 && (
          <span
            className={`text-sm font-medium ${growth > 0 ? 'text-green-400' : 'text-red-400'} bg-${growth > 0 ? 'green' : 'red'}-500/10 px-2 py-0.5 rounded-lg`}
          >
            {growth > 0 ? '+' : ''}
            {growth}% vs mes anterior
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey="month" stroke="#333" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#333" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 100}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="total_revenue_cents" fill="#27d3b8" radius={[4, 4, 0, 0]} name="Ingresos" />
          <Bar dataKey="total_commissions_cents" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Comisiones" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
