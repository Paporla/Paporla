'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { 
  Users, Store, Package, Calendar, CheckCircle, XCircle, 
  TrendingUp, Shield, ChevronRight
} from 'lucide-react';
import Card from '@/components/ui/Card';
import AlertsPanel from './components/AlertsPanel';
import AdminQuickActions from './components/AdminQuickActions';
import RecentActivity from './components/RecentActivity';
import ReservationChart from './components/ReservationChart';
import ShopsPieChart from './components/ShopsPieChart';

interface Stats {
  totalUsers: number;
  totalShops: number;
  totalPacks: number;
  totalReservations: number;
  verifiedShops: number;
  bannedShops: number;
  pendingShops: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalShops: 0,
    totalPacks: 0,
    totalReservations: 0,
    verifiedShops: 0,
    bannedShops: 0,
    pendingShops: 0,
  });
  const [reservationsByDay, setReservationsByDay] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    const { count: usersCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { data: shops, count: shopsCount } = await supabase
      .from('shops')
      .select('*', { count: 'exact' });

    const verifiedShops = shops?.filter(s => s.verified).length || 0;
    const bannedShops = shops?.filter(s => s.banned).length || 0;
    const pendingShops = shops?.filter(s => !s.verified && !s.banned).length || 0;

    const { count: packsCount } = await supabase
      .from('packs')
      .select('*', { count: 'exact', head: true });

    const { count: reservationsCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const reservationsData = await Promise.all(
      last7Days.map(async (day) => {
        const { count } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${day}T00:00:00`)
          .lt('created_at', `${day}T23:59:59`);
        
        return { day: day.slice(5), reservations: count || 0 };
      })
    );

    setStats({
      totalUsers: usersCount || 0,
      totalShops: shopsCount || 0,
      totalPacks: packsCount || 0,
      totalReservations: reservationsCount || 0,
      verifiedShops,
      bannedShops,
      pendingShops,
    });

    setReservationsByDay(reservationsData);
    setLoading(false);
  };

  const navCards = [
    { icon: Users, label: 'Usuarios', value: stats.totalUsers, href: '/admin/users', color: 'text-primary', bg: 'bg-primary/10', description: 'Gestionar usuarios' },
    { icon: Store, label: 'Comercios', value: stats.totalShops, href: '/admin/shops', color: 'text-secondary', bg: 'bg-secondary/10', description: 'Gestionar comercios' },
    { icon: TrendingUp, label: 'Estadisticas', value: 'Ver mas', href: '/admin/stats', color: 'text-primary', bg: 'bg-primary/10', description: 'Analisis detallado' },
  ];

  const statCards = [
    { icon: Package, label: 'Packs Creados', value: stats.totalPacks, color: 'text-primary', bg: 'bg-primary/10', href: '/admin/shops' },
    { icon: Calendar, label: 'Reservas', value: stats.totalReservations, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/admin/shops' },
    { icon: CheckCircle, label: 'Verificados', value: stats.verifiedShops, color: 'text-green-400', bg: 'bg-green-500/10', href: '/admin/shops' },
    { icon: XCircle, label: 'Baneados', value: stats.bannedShops, color: 'text-red-400', bg: 'bg-red-500/10', href: '/admin/shops' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando Estadisticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                Panel de Administracion
              </h1>
              <p className="text-gray-400">
                Bienvenido, <span className="text-primary font-medium">{user?.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {navCards.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={item.href}>
              <Card glass hover className="p-6 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-3xl font-bold ${item.color} mb-2`}>
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </div>
                    <div className="text-gray-400 text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                  </div>
                  <div className={`p-3 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-4 text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  Gestionar <ChevronRight className="w-3 h-3" />
                </div>
              </Card></Link>
          </motion.div>
        ))}
      </div>

      {/* Stats rapidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Link href={item.href}><Card glass className="p-4 cursor-pointer group hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${item.color}`}>
                    {item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{item.label}</div>
                </div>
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
              </div>
            </Card></Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AdminQuickActions />
        <AlertsPanel />
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ReservationChart data={reservationsByDay} />
        <ShopsPieChart 
          verified={stats.verifiedShops} 
          pending={stats.pendingShops} 
          banned={stats.bannedShops} 
          total={stats.totalShops} 
        />
      </div>

      {/* Actividad Reciente */}
      <RecentActivity />
    </div>
  );
}






