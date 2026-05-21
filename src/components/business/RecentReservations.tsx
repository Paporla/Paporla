'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Eye, Clock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils/formatPrice';
import { formatDate } from '@/lib/utils/formatDate';

interface Reservation {
  id: string;
  quantity: number;
  total_price_cents: number;
  status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  pack: {
    title: string;
  };
}

interface RecentReservationsProps {
  reservations: Reservation[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  no_show: 'bg-gray-500/20 text-gray-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Retirado',
  cancelled: 'Cancelada',
  no_show: 'No retirado',
};

export default function RecentReservations({ reservations }: RecentReservationsProps) {
  if (reservations.length === 0) {
    return (
      <Card glass className="p-6 text-center">
        <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No hay reservas aún</p>
        <p className="text-xs text-gray-500 mt-1">Las reservas aparecerán aquí cuando lleguen</p>
      </Card>
    );
  }

  return (
    <Card glass className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          Ultimas Reservas
        </h2>
        <Link href="/business/reservations">
          <Button variant="outline" size="sm">Ver todas</Button>
        </Link>
      </div>
      <div className="space-y-3">
        {reservations.map((reservation, idx) => (
          <motion.div
            key={reservation.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-gray-50 dark:hover:bg-white/10 hover:bg-gray-100 transition-colors group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                  {reservation.pack.title}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[reservation.status]}`}>
                  {statusLabels[reservation.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {reservation.user.name} • {reservation.quantity}x • {formatPrice(reservation.total_price_cents)}
              </p>
              <p className="text-xs text-gray-500">{formatDate(reservation.created_at)}</p>
            </div>
            <Link href="/business/reservations">
              <Eye className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors cursor-pointer" />
            </Link>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}