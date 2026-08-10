'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCard from './NotificationCard'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'

export default function NotificationList() {
  const { notifications, loading, error, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'all' ? notifications : notifications.filter((n) => !n.is_read)

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 dark:bg-white/5 bg-white dark:border-white/10 border-gray-200 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        type="notifications"
        action={{
          label: 'Explorar packs',
          onClick: () => (window.location.href = '/packs'),
        }}
      />
    )
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
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="dark:text-gray-500 text-gray-400 text-sm">
              No hay notificaciones {filter === 'unread' ? 'sin leer' : ''}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>

      {error && <Toast message={error} type="error" onClose={() => {}} />}
    </div>
  )
}
