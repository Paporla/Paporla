'use client';

import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAdminDashboard } from '@/components/admin/useAdminDashboard';
import AdminNavCards from '@/components/admin/AdminNavCards';
import AdminStatCards from '@/components/admin/AdminStatCards';
import AlertsPanel from './components/AlertsPanel';
import AdminQuickActions from './components/AdminQuickActions';
import RecentActivity from './components/RecentActivity';
import ReservationChart from './components/ReservationChart';
import ShopsPieChart from './components/ShopsPieChart';
import AdminDashboardLoading from '@/components/admin/AdminDashboardLoading';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { loading, stats, reservationsByDay } = useAdminDashboard();

  if (loading) return <AdminDashboardLoading />;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl"><Shield className="w-8 h-8 text-primary" /></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Panel de Administracion</h1>
              <p className="text-gray-400">Bienvenido, <span className="text-primary font-medium">{user?.email}</span></p>
            </div>
          </div>
        </div>
      </div>

      <AdminNavCards stats={stats} />
      <AdminStatCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AdminQuickActions />
        <AlertsPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ReservationChart data={reservationsByDay} />
        <ShopsPieChart verified={stats.verifiedShops} pending={stats.pendingShops} banned={stats.bannedShops} total={stats.totalShops} />
      </div>

      <RecentActivity />
    </div>
  );
}
