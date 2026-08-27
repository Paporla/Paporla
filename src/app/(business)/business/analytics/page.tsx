'use client'

import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { BarChart3, TrendingUp } from 'lucide-react'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import Button from '@/components/ui/Button'
import BusinessAnalyticsHeader from '@/components/business/analytics/BusinessAnalyticsHeader'
import AnalyticsSummaryCards from '@/components/business/analytics/AnalyticsSummaryCards'
import ReservationChart from '@/components/business/analytics/ReservationChart'
import RevenueChart from '@/components/business/analytics/RevenueChart'
import PeakHoursChart from '@/components/business/analytics/PeakHoursChart'
import TopPacksTable from '@/components/business/analytics/TopPacksTable'
import CancellationRate from '@/components/business/analytics/CancellationRate'
import WeekComparison from '@/components/business/analytics/WeekComparison'
import { useBusinessAnalytics } from '@/components/business/analytics/useBusinessAnalytics'

export default function BusinessAnalyticsPage() {
  const {
    loading,
    error,
    shop,
    summary,
    revenueTrend,
    reservationTrend,
    peakHours,
    topPacks,
    cancellationRate,
    weeklyComparison,
  } = useBusinessAnalytics()

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Error al cargar las estadísticas</h2>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Estadisticas</h2>
          <p className="dark:text-gray-400 text-gray-600">Registra tu comercio para ver las estadisticas.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      <BusinessAnalyticsHeader shop={shop} />
      <AnalyticsSummaryCards summary={summary} />
      <WeekComparison comparison={weeklyComparison} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservationChart
          data={reservationTrend}
          title="Reservas (últimos 7 días)"
          trend={weeklyComparison.reservationChange}
        />
        <RevenueChart data={revenueTrend} title="Ingresos (últimos 7 días)" trend={weeklyComparison.revenueChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeakHoursChart data={peakHours} />
        <TopPacksTable packs={topPacks} />
      </div>

      <CancellationRate data={cancellationRate} />

      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium dark:text-white text-gray-900">Datos actualizados en tiempo real</p>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
              Las estadísticas se actualizan automáticamente. Los datos reflejan la actividad general de tu comercio.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
