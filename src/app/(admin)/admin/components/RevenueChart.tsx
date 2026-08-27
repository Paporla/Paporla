'use client'

import { useAdminTrend } from '@/components/admin/useAdminTrend'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/**
 * Gráfico de ingresos del panel admin (Fase 6.5): sobre la RPC canónica
 * `admin_dashboard_trend` (0032) vía useAdminTrend. La versión anterior hacía
 * `.from('reservations')` directo (que el esquema 0012 deniega) y leía
 * `total_price_cents` (campo legacy inexistente; el real es
 * `total_amount_minor`), así que siempre mostraba "no hay datos" aunque
 * existieran reservas.
 */

interface RevenueData {
  month: string
  revenue_minor: number
  commissions_minor: number
  count: number
}

interface TooltipPayload {
  active?: boolean
  payload?: { value: number; payload: RevenueData }[]
}

/**
 * Tooltip del gráfico. Fuera del componente (no se puede definir un
 * componente durante el render): la moneda llega por props y recharts
 * inyecta las suyas (active/payload) encima.
 */
const ChartTooltip = ({ currency, active, payload }: { currency: string } & TooltipPayload) => {
  if (active && payload && payload.length) {
    return (
      <div className="dark:bg-black/90 bg-white/90 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-xl p-3 shadow-xl">
        <p className="text-sm font-semibold dark:text-white text-gray-900 mb-2">{payload[0].payload.month}</p>
        <p className="text-xs text-primary">
          Ingresos: <span className="font-bold">{formatMinorPrice(payload[0].value, currency, 'es-CL')}</span>
        </p>
        <p className="text-xs text-secondary">
          Comisiones: <span className="font-bold">{formatMinorPrice(payload[1].value, currency, 'es-CL')}</span>
        </p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Reservas: {payload[0].payload.count}</p>
      </div>
    )
  }
  return null
}

export default function RevenueChart() {
  const trend = useAdminTrend()

  const data: RevenueData[] = (trend.data?.revenue_by_month ?? []).map((m) => ({
    month: new Date(`${m.month}-01`).toLocaleDateString('es', { month: 'short' }),
    revenue_minor: m.revenue_minor,
    commissions_minor: m.commissions_minor,
    count: m.count,
  }))
  const currency = trend.data?.currency_code ?? 'CLP'

  // El RPC devuelve siempre 12 meses (rellenados con ceros); para el usuario
  // "ningún mes con reservas" es lo mismo que no hay datos: estado vacío.
  const hasData = data.some((d) => d.count > 0)

  if (trend.isLoading) {
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

  if (trend.isError) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-sm text-red-400">No se pudieron cargar los datos de ingresos.</p>
        <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">Revisa tu sesión o vuelve a intentarlo.</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="dark:text-gray-500 text-gray-400 text-sm">No hay datos de ingresos disponibles</p>
        <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">
          Los datos se mostraran cuando haya reservas completadas
        </p>
      </div>
    )
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue_minor, 0)

  let growth = 0
  const withReservations = data.filter((d) => d.count > 0)
  if (withReservations.length >= 2) {
    const last = withReservations[withReservations.length - 1].revenue_minor
    const prev = withReservations[withReservations.length - 2].revenue_minor
    if (prev > 0) growth = Math.round(((last - prev) / prev) * 100)
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
          {formatMinorPrice(totalRevenue, currency, 'es-CL')}
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
          <YAxis
            stroke="#888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatMinorPrice(v, currency, 'es-CL')}
          />
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="revenue_minor" fill="#00ff88" radius={[4, 4, 0, 0]} name="Ingresos" />
          <Bar dataKey="commissions_minor" fill="#ff8a3c" radius={[4, 4, 0, 0]} name="Comisiones" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
