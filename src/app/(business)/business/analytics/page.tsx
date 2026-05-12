'use client'

import { motion } from 'framer-motion'
import { TrendingUp, BarChart3 } from 'lucide-react'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import BusinessAnalyticsHeader from '@/components/business/analytics/BusinessAnalyticsHeader'
import AnalyticsSummaryCards from '@/components/business/analytics/AnalyticsSummaryCards'
import ReservationTrendChart from '@/components/business/analytics/ReservationTrendChart'
import RevenueTrendChart from '@/components/business/analytics/RevenueTrendChart'
import PeakHoursChart from '@/components/business/analytics/PeakHoursChart'
import TopPacksTable from '@/components/business/analytics/TopPacksTable'
import CancellationRate from '@/components/business/analytics/CancellationRate'
import WeekComparison from '@/components/business/analytics/WeekComparison'
import { useBusinessAnalytics } from '@/components/business/analytics/useBusinessAnalytics'

export default function BusinessAnalyticsPage() {
  const {
    loading, shop, summary, revenueTrend, reservationTrend,
    peakHours, topPacks, cancellationRate, weeklyComparison,
  } = useBusinessAnalytics()

  if (loading) return <LoadingSkeleton />

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="card-base max-w-md">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Estadisticas</h2>
          <p className="text-gray-400">Registra tu comercio para ver las estadisticas.</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      {/* Header */}
      <BusinessAnalyticsHeader shop={shop} />

      {/* Resumen de metricas */}
      <AnalyticsSummaryCards summary={summary} />

      {/* Comparativa semanal */}
      <WeekComparison comparison={weeklyComparison} />

      {/* Graficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservationTrendChart data={reservationTrend} />
        <RevenueTrendChart data={revenueTrend} />
      </div>

      {/* Horarios pico + Top packs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakHoursChart data={peakHours} />
        <TopPacksTable packs={topPacks} />
      </div>

      {/* Tasa de cancelacion */}
      <CancellationRate data={cancellationRate} />

      {/* Nota informativa */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Datos actualizados en tiempo real</p>
            <p className="text-xs text-gray-500 mt-1">
              Las estadisticas se actualizan automaticamente. Los datos reflejan la actividad general de tu comercio en Paporla.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
