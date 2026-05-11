'use client';

import { motion } from 'framer-motion';
import { 
  Clock, 
  XCircle, 
  CheckCircle, 
  Package, 
  ShieldCheck,
  Trash2
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const iconMap = {
  pickup_reminder: { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  cancellation: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  confirmation: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  new_pack: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  shop_verified: { icon: ShieldCheck, color: 'text-primary', bg: 'bg-primary/10' },
};

export default function NotificationCard({ notification, onMarkAsRead, onDelete }: NotificationCardProps) {
  const config = iconMap[notification.type] || iconMap.confirmation;
  const Icon = config.icon;
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Hace unos segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={handleClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isUnread ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
            {notification.message}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {timeAgo(notification.created_at)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}