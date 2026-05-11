'use client';

import { motion } from 'framer-motion';
import { Package, ShoppingBag, Clock, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

interface BusinessStatsCardsProps {
  stats: {
    activePacks: number;
    totalPacks: number;
    totalReservations: number;
    pendingReservations: number;
    totalRevenue: number;
  };
}

export default function BusinessStatsCards({ stats }: BusinessStatsCardsProps) {
  const items = [
    { 
      label: 'Packs Activos', 
      value: stats.activePacks, 
      total: stats.totalPacks,
      icon: Package, 
      color: 'text-primary',
      bg: 'bg-primary/10',
      link: '/business/packs',
      description: 'Disponibles para venta'
    },
    { 
      label: 'Reservas Totales', 
      value: stats.totalReservations, 
      icon: ShoppingBag, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      link: '/business/reservations',
      description: 'Pedidos recibidos'
    },
    { 
      label: 'Pendientes', 
      value: stats.pendingReservations, 
      icon: Clock, 
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      link: '/business/reservations?status=pending',
      description: 'Por confirmar'
    },
    { 
      label: 'Ingresos', 
      value: `$${(stats.totalRevenue / 100).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      link: '/business/reservations',
      description: 'Acumulados'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Link href={item.link}>
            <Card glass hover className="p-5 cursor-pointer group transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  {item.total !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">de {item.total} totales</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
                <div className={`p-3 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
              </div>
              <div className="mt-3 text-xs text-primary/50 flex items-center gap-1 group-hover:gap-2 transition-all">
                Ver detalles →
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}