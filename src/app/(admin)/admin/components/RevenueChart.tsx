'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
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
        <p className="text-xs text-secondary">
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

      // Consultar reservas completadas (picked_up) en vez de la tabla revenue_metrics que no existe
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, total_price_cents, created_at')
        .eq('status', 'picked_up')
        .order('created_at', { ascending: true })

      if (error) {
        logger.error('Admin RevenueChart', error)
        setLoading(false)
        return
      }

      if (!reservations || reservations.length === 0) {
        setLoading(false)
        return
      }

      // Agrupar por mes en JS
      const monthlyMap = new Map<string, { revenue: number; commissions: number; count: number }>()

      for (const r of reservations) {
        const date = new Date(r.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyMap.get(monthKey) ?? { revenue: 0, commissions: 0, count: 0 }
        const revenue = r.total_price_cents ?? 0
        existing.revenue += revenue
        existing.commissions += Math.round(revenue * 0.1) // 10% comision
        existing.count += 1
        monthlyMap.set(monthKey, existing)
      }

      const formattedData: RevenueData[] = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, values]) => ({
          month: new Date(monthKey + '-01').toLocaleDateString('es', { month: 'short' }),
          total_revenue_cents: values.revenue,
          total_commissions_cents: values.commissions,
          total_reservations: values.count,
        }))

      setData(formattedData)

      const total = formattedData.reduce((sum, item) => sum + item.total_revenue_cents, 0)
      setTotalRevenue(total)

      if (formattedData.length >= 2) {
        const last = formattedData[formattedData.length - 1].total_revenue_cents
        const prev = formattedData[formattedData.length - 2].total_revenue_cents
        if (prev > 0) setGrowth(Math.round(((last - prev) / prev) * 100))
      }

      setLoading(false)
    }

    loadRevenueData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
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
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="dark:text-gray-500 text-gray-400 text-sm">No hay datos de ingresos disponibles</p>
        <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">
          Los datos se mostraran cuando haya reservas completadas
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6">
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
            <div className="w-3 h-3 rounded-sm bg-secondary" />
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
            className={`text-sm font-medium px-2 py-0.5 rounded-lg ${growth > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
          >
            {growth > 0 ? '+' : ''}
            {growth}% vs mes anterior
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.3} />
          <XAxis dataKey="month" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 100}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="total_revenue_cents" fill="#00ff88" radius={[4, 4, 0, 0]} name="Ingresos" />
          <Bar dataKey="total_commissions_cents" fill="#ff8a3c" radius={[4, 4, 0, 0]} name="Comisiones" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
