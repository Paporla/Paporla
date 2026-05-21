'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { DollarSign, ShoppingBag, Calendar, Package, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';

interface AnalyticsSummary {
  totalRevenue: number;
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  activePacks: number;
  totalPacksCreated: number;
}

interface AnalyticsSummaryCardsProps {
  summary: AnalyticsSummary;
}

const cards = [
  { key: 'totalRevenue', label: 'Ingresos totales', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', link: '/business/analytics', suffix: '$', isPrice: true },
  { key: 'totalReservations', label: 'Reservas totales', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/business/reservations', suffix: '' },
  { key: 'completedReservations', label: 'Completadas', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', link: '/business/reservations?status=picked_up', suffix: '' },
  { key: 'cancelledReservations', label: 'Canceladas', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', link: '/business/reservations?status=cancelled', suffix: '' },
  { key: 'activePacks', label: 'Packs activos', icon: Package, color: 'text-primary', bg: 'bg-primary/10', link: '/business/packs', suffix: '' },
  { key: 'totalPacksCreated', label: 'Packs creados', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/business/packs', suffix: '' },
];

export default function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  const getValue = (key: string) => {
    if (key === 'totalRevenue') {
      return `$${(summary.totalRevenue / 100).toLocaleString()}`;
    }
    return summary[key as keyof AnalyticsSummary];
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Link href={card.link}>
            <div className="group bg-dark-card dark:bg-white dark:border-gray-200 border border-dark-border hover:border-primary/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <div className={`p-2 rounded-xl ${card.bg} inline-flex mb-3 group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-xl font-bold ${card.color}`}>
                {getValue(card.key)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}