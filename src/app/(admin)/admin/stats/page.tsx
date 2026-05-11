'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  Users, Store, Package, Calendar, TrendingUp, 
  TrendingDown, Activity, UserCheck 
} from 'lucide-react';
import Card from '@/components/ui/Card';
import RevenueChart from '../components/RevenueChart';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell, 
  ResponsiveContainer, Area, AreaChart
} from 'recharts';

const COLORS = {
  primary: '#27d3b8',
  secondary: '#ff8a3c',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  pink: '#ec4899',
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.blue];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type TimeRange = '7d' | '30d' | 'all';

export default function AdminStatsPage() {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState({ totalUsers: 0, totalShops: 0, totalPacks: 0, totalReservations: 0 });
  const [userStats, setUserStats] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [topShops, setTopShops] = useState<any[]>([]);
  const [growth, setGrowth] = useState({ users: 0, reservations: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    const [{ count: usersCount }, { count: shopsCount }, { count: packsCount }, { count: reservationsCount }] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('shops').select('*', { count: 'exact', head: true }),
      supabase.from('packs').select('*', { count: 'exact', head: true }),
      supabase.from('reservations').select('*', { count: 'exact', head: true }),
    ]);

    setSummary({
      totalUsers: usersCount || 0,
      totalShops: shopsCount || 0,
      totalPacks: packsCount || 0,
      totalReservations: reservationsCount || 0,
    });

    const lastDays = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const usersByDay = await Promise.all(
      lastDays.map(async (day) => {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', day + 'T00:00:00')
          .lt('created_at', day + 'T23:59:59');
        return { day: day.slice(5), registrations: count || 0 };
      })
    );
    setUserStats(usersByDay);

    const last7 = usersByDay.slice(-7).reduce((s, d) => s + d.registrations, 0);
    const prev7 = usersByDay.slice(-14, -7).reduce((s, d) => s + d.registrations, 0);
    setGrowth({
      users: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0,
      reservations: 0,
    });

    const roles = ['user', 'comercio', 'admin', 'super_admin'];
    const roleLabels: Record<string, string> = { user: 'Usuarios', comercio: 'Comercios', admin: 'Admins', super_admin: 'Super Admins' };
    const roleData = await Promise.all(
      roles.map(async (role) => {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', role);
        return { name: roleLabels[role] || role, value: count || 0 };
      })
    );
    setRoleDistribution(roleData);

    const { data: reservations } = await supabase.from('reservations').select('shop_id');
    const { data: shops } = await supabase.from('shops').select('id, name');
    const shopNameMap = new Map(shops?.map(s => [s.id, s.name]) || []);
    const shopCounts = new Map<string, number>();
    reservations?.forEach(r => shopCounts.set(r.shop_id, (shopCounts.get(r.shop_id) || 0) + 1));
    const topShopsData = Array.from(shopCounts.entries())
      .map(([id, count]) => ({ name: shopNameMap.get(id) || 'Desconocido', reservations: count }))
      .sort((a, b) => b.reservations - a.reservations)
      .slice(0, 5);
    setTopShops(topShopsData);

    setLoading(false);
  };

  const filteredUserStats = useMemo(() => {
    if (timeRange === 'all') return userStats;
    const days = timeRange === '7d' ? 7 : 30;
    return userStats.slice(-days);
  }, [userStats, timeRange]);

  const summaryCards = [
    { icon: Users, label: 'Usuarios', value: summary.totalUsers, color: COLORS.primary, bg: 'bg-primary/10', growth: growth.users },
    { icon: Store, label: 'Comercios', value: summary.totalShops, color: COLORS.secondary, bg: 'bg-secondary/10' },
    { icon: Package, label: 'Packs', value: summary.totalPacks, color: COLORS.purple, bg: 'bg-purple-500/10' },
    { icon: Calendar, label: 'Reservas', value: summary.totalReservations, color: COLORS.blue, bg: 'bg-blue-500/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-52 bg-gray-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-900 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-900 rounded-2xl animate-pulse" />
          <div className="h-96 bg-gray-900 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-1">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Estadisticas</h1>
            <p className="text-gray-400 mt-1">Analisis detallado del crecimiento y actividad de la plataforma.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card glass className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={'p-2.5 rounded-xl ' + card.bg}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                {'growth' in card && card.growth !== undefined && card.growth !== 0 && (
                  <span className={'flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-lg ' + (
                    card.growth > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                  )}>
                    {card.growth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(card.growth ?? 0)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-white tabular-nums">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <RevenueChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card glass className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Registros de Usuarios</h3>
                <p className="text-xs text-gray-500 mt-0.5">Ultimos {timeRange === 'all' ? '30' : timeRange === '7d' ? '7' : '30'} dias</p>
              </div>
              <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={'text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-all ' + (
                      timeRange === range 
                        ? 'bg-primary text-black' 
                        : 'text-gray-500 hover:text-white'
                    )}
                  >
                    {range === '7d' ? '7D' : range === '30d' ? '30D' : 'Todo'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredUserStats}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="day" stroke="#333" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#333" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="registrations" stroke={COLORS.primary} strokeWidth={2} fill="url(#userGradient)" name="Registros" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card glass className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Distribucion por Rol</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1000}
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={'cell-' + index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {roleDistribution.map((role, i) => (
                <div key={role.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-gray-400">{role.name}</span>
                  <span className="text-white font-medium ml-auto">{role.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card glass className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Top 5 Comercios con mas Reservas</h3>
                <p className="text-xs text-gray-500 mt-0.5">Comercios con mejor rendimiento</p>
              </div>
              {topShops.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg">
                  <UserCheck className="w-3.5 h-3.5" />
                  Total: {topShops.reduce((s, s2) => s + s2.reservations, 0)} reservas
                </div>
              )}
            </div>
            {topShops.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topShops} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                  <XAxis type="number" stroke="#333" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#333" fontSize={11} tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS.secondary} />
                      <stop offset="100%" stopColor={COLORS.primary} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="reservations" fill="url(#barGradient)" radius={[0, 6, 6, 0]} name="Reservas" animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No hay datos suficientes</p>
                <p className="text-xs text-gray-600 mt-1">Las estadisticas apareceran cuando haya reservas.</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}



