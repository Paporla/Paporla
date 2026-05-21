'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Package, Calendar, ShoppingBag, DollarSign, TrendingUp, Users } from 'lucide-react';

interface DashboardStats {
  activePacks: number;
  totalPacks: number;
  todayReservations: number;
  totalReservations: number;
  totalRevenue: number;
  pendingReservations: number;
}

interface BusinessStatsGridProps {
  stats: DashboardStats;
}

const statItems = [
  { key: 'activePacks', label: 'Packs Activos', icon: Package, color: 'text-primary', bg: 'bg-primary/10', link: '/business/packs', suffix: '' },
  { key: 'totalPacks', label: 'Packs Creados', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/business/packs', suffix: '' },
  { key: 'todayReservations', label: 'Reservas Hoy', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10', link: '/business/reservations', suffix: '' },
  { key: 'pendingReservations', label: 'Pendientes', icon: ShoppingBag, color: 'text-yellow-400', bg: 'bg-yellow-500/10', link: '/business/reservations?status=pending', suffix: '' },
  { key: 'totalReservations', label: 'Reservas Totales', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/business/reservations', suffix: '' },
  { key: 'totalRevenue', label: 'Ingresos', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', link: '/business/analytics', suffix: '', isPrice: true },
];

export default function BusinessStatsGrid({ stats }: BusinessStatsGridProps) {
  const getValue = (key: string, isPrice?: boolean) => {
    if (isPrice) {
      return `$${((stats[key as keyof DashboardStats] as number) / 100).toLocaleString()}`;
    }
    return stats[key as keyof DashboardStats];
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statItems.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Link href={item.link}>
            <div className="group bg-dark-card dark:bg-white dark:border-gray-200 border border-dark-border hover:border-primary/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                {item.key === 'activePacks' && stats.activePacks > 0 && (
                  <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Activos
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>
                {getValue(item.key, item.isPrice)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              <div className="mt-2 text-[10px] text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalles →
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}