'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { Store, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessStatsCards from '@/components/business/BusinessStatsCards';
import QuickActions from '@/components/business/QuickActions';
import RecentReservations from '@/components/business/RecentReservations';
import DashboardPacksList from '@/components/business/dashboard/DashboardPacksList';
import { useBusinessDashboard } from '@/components/business/dashboard/useBusinessDashboard';

export default function BusinessDashboard() {
  const router = useRouter();
  const { shop, packs, recentReservations, loading, stats } = useBusinessDashboard();

  useEffect(() => {
    if (shop && (!shop.name || !shop.logo_url)) {
      router.push('/business/profile');
    }
  }, [shop]);

  if (loading) return <LoadingSkeleton />;

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 max-w-md border border-white/10">
          <Store className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Bienvenido a Paporla!</h2>
          <p className="text-gray-400 mb-6">Para comenzar a vender packs, primero debes registrar tu comercio.</p>
          <Link href="/business/profile"><Button>Completar mi perfil de comercio</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      <BusinessHeader shop={shop} />
      <BusinessStatsCards stats={stats} />
      <QuickActions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DashboardPacksList packs={packs} />
        <RecentReservations reservations={recentReservations} />
      </div>
      {stats.pendingReservations > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Link href="/business/reservations">
            <Card glass hover className="p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg"><AlertCircle className="w-5 h-5 text-yellow-400" /></div>
                  <div>
                    <p className="text-sm text-gray-400">Tienes</p>
                    <p className="font-semibold text-white">
                      {stats.pendingReservations} reserva{stats.pendingReservations !== 1 ? 's' : ''} pendiente{stats.pendingReservations !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1">Gestionar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </Card>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
