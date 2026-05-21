'use client';

import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import BusinessAnalyticsHeader from '@/components/business/analytics/BusinessAnalyticsHeader';
import AnalyticsSummaryCards from '@/components/business/analytics/AnalyticsSummaryCards';
import ReservationChart from '@/components/business/analytics/ReservationChart';
import RevenueChart from '@/components/business/analytics/RevenueChart';
import PeakHoursChart from '@/components/business/analytics/PeakHoursChart';
import TopPacksTable from '@/components/business/analytics/TopPacksTable';
import CancellationRate from '@/components/business/analytics/CancellationRate';
import WeekComparison from '@/components/business/analytics/WeekComparison';
import { useBusinessAnalytics } from '@/components/business/analytics/useBusinessAnalytics';

export default function BusinessAnalyticsPage() {
  const {
    loading,
    shop,
    summary,
    revenueTrend,
    reservationTrend,
    peakHours,
    topPacks,
    cancellationRate,
    weeklyComparison,
  } = useBusinessAnalytics();

  if (loading) return <LoadingSkeleton />;

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-black/40 dark:bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-md border dark:border-white/10 border-gray-200">
          <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Estadisticas</h2>
          <p className="dark:text-gray-400 text-gray-600">Registra tu comercio para ver las estadisticas.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-8"
    >
      <BusinessAnalyticsHeader shop={shop} />
      <AnalyticsSummaryCards summary={summary} />
      <WeekComparison comparison={weeklyComparison} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservationChart 
          data={reservationTrend} 
          title="Reservas (últimos 7 días)" 
          trend={weeklyComparison.reservationChange} 
        />
        <RevenueChart 
          data={revenueTrend} 
          title="Ingresos (últimos 7 días)" 
          trend={weeklyComparison.revenueChange} 
        />
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
  );
}