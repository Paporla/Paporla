'use client';

import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useAdminStats } from '@/components/admin/useAdminStats';
import StatsSummaryCards from '@/components/admin/StatsSummaryCards';
import StatsUserChart from '@/components/admin/StatsUserChart';
import StatsRolePie from '@/components/admin/StatsRolePie';
import StatsTopShops from '@/components/admin/StatsTopShops';
import RevenueChart from '../components/RevenueChart';
import AdminStatsLoading from '@/components/admin/AdminStatsLoading';

export default function AdminStatsPage() {
  const { loading, summary, userStats, roleDistribution, topShops, growth } = useAdminStats();

  if (loading) return <AdminStatsLoading />;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-1">
          <div className="p-3 bg-primary/20 rounded-xl"><Activity className="w-8 h-8 text-primary" /></div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Estadisticas</h1>
            <p className="dark:text-gray-400 text-gray-600 mt-1">Analisis detallado del crecimiento y actividad de la plataforma.</p>
          </div>
        </div>
      </motion.div>

      <StatsSummaryCards summary={summary} growth={growth} />
      <RevenueChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <StatsUserChart data={userStats} />
        <StatsRolePie data={roleDistribution} />
        <div className="lg:col-span-2"><StatsTopShops data={topShops} /></div>
      </div>
    </div>
  );
}
