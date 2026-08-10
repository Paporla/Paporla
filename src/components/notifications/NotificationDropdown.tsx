'use client'

import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCard from './NotificationCard'

interface NotificationDropdownProps {
  onClose: () => void
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="dark:bg-gray-900 bg-white dark:border-gray-700 border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 dark:border-gray-700 border-gray-200">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold dark:text-white text-gray-900">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Marcar todas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay notificaciones</p>
            <p className="text-xs text-gray-600 mt-1">Las notificaciones apareceran aqui</p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 5 && (
        <div className="p-3 dark:border-gray-700 border-gray-200 text-center">
          <Link href="/dashboard/notifications" onClick={onClose} className="text-xs text-primary hover:underline">
            Ver todas las notificaciones →
          </Link>
        </div>
      )}
    </div>
  )
}
