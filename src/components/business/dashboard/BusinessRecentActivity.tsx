'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils/formatDate';

interface Activity {
  id: string;
  type: 'reservation' | 'pack' | 'review';
  title: string;
  description: string;
  status?: string;
  created_at: string;
  link?: string;
}

interface BusinessRecentActivityProps {
  activities?: Activity[];
}

const statusConfig: Record<string, { icon: any; color: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400' },
  confirmed: { icon: CheckCircle, color: 'text-blue-400' },
  picked_up: { icon: CheckCircle, color: 'text-green-400' },
  cancelled: { icon: XCircle, color: 'text-red-400' },
};

export default function BusinessRecentActivity({ activities = [] }: BusinessRecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 text-center">
        <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No hay actividad reciente</p>
        <p className="text-xs text-gray-500 mt-1">Las nuevas reservas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 border-b border-dark-border">
        <div>
          <h3 className="text-lg font-semibold text-white">Actividad reciente</h3>
          <p className="text-xs text-gray-500">Últimas reservas y movimientos</p>
        </div>
        <Link href="/business/reservations" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Ver todas →
        </Link>
      </div>

      <div className="divide-y divide-dark-border">
        {activities.slice(0, 5).map((activity, idx) => {
          const StatusIcon = activity.status ? statusConfig[activity.status]?.icon : null;
          const statusColor = activity.status ? statusConfig[activity.status]?.color : '';

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                    {activity.title}
                  </p>
                  {StatusIcon && (
                    <StatusIcon className={`w-3 h-3 ${statusColor}`} />
                  )}
                  {activity.status && (
                    <span className="text-[10px] text-gray-500">
                      {activity.status === 'pending' ? 'Pendiente' :
                       activity.status === 'confirmed' ? 'Confirmada' :
                       activity.status === 'picked_up' ? 'Recogido' : 'Cancelado'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                <p className="text-[10px] text-gray-600 mt-1">{formatRelativeDate(activity.created_at)}</p>
              </div>
              {activity.link && (
                <Link href={activity.link}>
                  <Eye className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors cursor-pointer" />
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}