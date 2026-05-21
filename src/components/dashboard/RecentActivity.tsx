'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, Eye, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils/formatDate';
import { formatPrice } from '@/lib/utils/formatPrice';

interface Activity {
  id: string;
  type: 'reservation' | 'favorite' | 'completed';
  title: string;
  description: string;
  status?: string;
  price?: number;
  quantity?: number;
  created_at: string;
  link?: string;
}

interface ActivityGroup {
  title: string;
  icon: any;
  color: string;
  bg: string;
  activities: Activity[];
}

interface RecentActivityProps {
  activities?: Activity[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ready_pickup: { label: 'Lista para recoger', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  picked_up: { label: 'Recogido', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  no_show: { label: 'No retirado', icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

export default function RecentActivity({ activities = [] }: RecentActivityProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    activas: true,
    completadas: false,
    canceladas: false,
  });

  // Agrupar actividades por tipo
  const groups: ActivityGroup[] = [
    {
      title: 'Reservas Activas',
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      activities: activities.filter(a => ['pending', 'confirmed', 'ready_pickup'].includes(a.status || '')),
    },
    {
      title: 'Completadas',
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      activities: activities.filter(a => ['picked_up', 'completed'].includes(a.status || '')),
    },
    {
      title: 'Canceladas',
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      activities: activities.filter(a => a.status === 'cancelled'),
    },
  ].filter(group => group.activities.length > 0);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  if (activities.length === 0) {
    return (
      <div className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 rounded-2xl p-6 text-center">
        <ShoppingBag className="w-12 h-12 dark:text-gray-600 text-gray-400 mx-auto mb-3" />
        <p className="dark:text-gray-400 text-gray-600">No hay actividad reciente</p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Explora packs para empezar a rescatar comida</p>
        <Link href="/packs" className="text-xs text-primary hover:underline inline-block mt-2">
          Explorar packs →
        </Link>
      </div>
    );
  }

  return (
    <div className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 border-b dark:border-dark-border border-gray-200">
        <div>
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Actividad reciente</h3>
          <p className="text-xs dark:text-gray-500 text-gray-400">Tus reservas y movimientos</p>
        </div>
        <Link href="/reservations" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Ver todas →
        </Link>
      </div>

      <div className="divide-y divide-dark-border">
        {groups.map((group, groupIdx) => {
          const Icon = group.icon;
          const isExpanded = expandedGroups[group.title] ?? false;

          return (
            <div key={group.title} className="dark:bg-dark-card/30 bg-gray-50">
              {/* Header del grupo - click para expandir/colapsar */}
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between p-4 dark:hover:bg-white/5 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${group.bg}`}>
                    <Icon className={`w-4 h-4 ${group.color}`} />
                  </div>
                  <h4 className="font-medium dark:text-white text-gray-900">{group.title}</h4>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {group.activities.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Contenido expandible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="divide-y dark:divide-dark-border/50 divide-gray-200 border-t dark:border-dark-border/50 border-gray-200">
                      {group.activities.slice(0, 5).map((activity, idx) => {
                        const status = statusConfig[activity.status || ''] || {
                          label: activity.status,
                          icon: ShoppingBag,
                          color: 'text-gray-400',
                          bg: 'bg-gray-500/10',
                        };
                        const StatusIcon = status.icon;

                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-start gap-4 p-4 dark:hover:bg-white/5 hover:bg-gray-100 transition-colors group"
                          >
                            <div className={`p-2 rounded-xl ${status.bg} flex-shrink-0`}>
                              <StatusIcon className={`w-4 h-4 ${status.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                                  {activity.title}
                                </p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{activity.description}</p>
                              {activity.price && (
                                <p className="text-[10px] text-primary font-medium mt-0.5">
                                  {formatPrice(activity.price)} • {activity.quantity || 1}x
                                </p>
                              )}
                              <p className="text-[10px] dark:text-gray-600 text-gray-500 mt-1">
                                {formatRelativeDate(activity.created_at)}
                              </p>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}