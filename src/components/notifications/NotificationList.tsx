'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationCard from './NotificationCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function NotificationList() {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.is_read);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 dark:bg-gray-900 bg-white dark:border-gray-700 border-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        type="reservations"
        action={{
          label: 'Explorar packs',
          onClick: () => window.location.href = '/packs',
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'all' 
                ? 'bg-primary/20 text-primary' 
                : 'dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === 'unread' 
                ? 'bg-primary/20 text-primary' 
                : 'dark:text-gray-500 text-gray-400 dark:hover:text-white hover:text-gray-900'
            }`}
          >
            No leidas
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Marcar todas como leidas
        </Button>
      </div>

      {/* Lista de notificaciones */}
      <div className="space-y-2">
        {filteredNotifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        ))}
      </div>
    </div>
  );
}