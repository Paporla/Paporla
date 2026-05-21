'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Calendar, Package, Leaf, DollarSign } from 'lucide-react';

interface UserStats {
  activeReservations: number;
  totalPacksRescued: number;
  co2Saved: number;
  moneySaved: number;
  points?: number;
  level?: string;
}

interface UserStatsGridProps {
  stats: UserStats;
}

const statItems = [
  { key: 'activeReservations', label: 'Reservas activas', icon: Calendar, color: 'text-primary', bg: 'bg-primary/10', link: '/reservations', suffix: '' },
  { key: 'totalPacksRescued', label: 'Packs rescatados', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/reservations', suffix: '' },
  { key: 'co2Saved', label: 'CO₂ evitado', icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10', link: '/dashboard', suffix: 'kg' },
  { key: 'moneySaved', label: 'Ahorrado', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', link: '/dashboard', suffix: '', isPrice: true },
];

export default function UserStatsGrid({ stats }: UserStatsGridProps) {
  const getValue = (key: string, isPrice?: boolean, suffix?: string) => {
    const value = stats[key as keyof UserStats];
    if (isPrice && typeof value === 'number') {
      return `$${value.toLocaleString()}`;
    }
    if (suffix && typeof value === 'number') {
      return `${value}${suffix}`;
    }
    return value ?? 0;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Link href={item.link}>
            <div className="group dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 hover:border-primary/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className={`p-2 rounded-xl ${item.bg} inline-flex mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className={`text-xl font-bold ${item.color}`}>
                {getValue(item.key, item.isPrice, item.suffix)}
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