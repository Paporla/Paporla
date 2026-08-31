'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Clock, Package, CheckCircle, XCircle, AlertCircle, Store } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/formatTime'
import { useNotifications } from '@/hooks/useNotifications'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'

const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  new_reservation: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  pickup_completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  user_cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  cancellation: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  confirmation: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  pickup_reminder: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  new_user: { icon: Bell, color: 'text-secondary', bg: 'bg-secondary/10' },
  new_shop: { icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
  incidence: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
}

const defaultIcon = { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/10' }

export default function BusinessNotificationsPage() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // "No leída" = `read_at IS NULL` (columna real de 0006; no existe `is_read`).
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter((n) => n.read_at === null)

  const handleMarkAll = async () => {
    const ok = await markAllAsRead()
    setToast(
      ok
        ? { message: 'Todas las notificaciones marcadas como leídas', type: 'success' }
        : { message: 'No se pudieron marcar todas como leídas. Inténtalo de nuevo.', type: 'error' },
    )
    setTimeout(() => setToast(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Notificaciones</h1>
          <p className="dark:text-gray-400 text-gray-600 mt-1">Mantente al dia con la actividad de tu comercio</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl dark:bg-gray-800 bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 w-48 dark:bg-gray-800 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-64 dark:bg-gray-800 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Notificaciones</h1>
              {unreadCount > 0 && (
                <span className="text-sm bg-primary/20 text-primary px-2.5 py-1 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <p className="dark:text-gray-400 text-gray-600">Mantente al dia con la actividad de tu comercio</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} className="flex items-center gap-1">
              <CheckCheck className="w-4 h-4" />
              Marcar todas
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'dark:bg-dark-muted bg-gray-100 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'unread'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'dark:bg-dark-muted bg-gray-100 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900'
          }`}
        >
          No leidas
          {unreadCount > 0 && (
            <span className="ml-1.5 text-xs bg-primary/30 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Lista de notificaciones */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          type="notifications"
          action={{
            label: 'Explorar packs',
            onClick: () => router.push('/business/packs'),
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, idx) => {
            const { icon: Icon, color, bg } = iconMap[notification.type] || defaultIcon
            const isUnread = notification.read_at === null

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`cursor-pointer transition-all duration-200 ${isUnread ? 'border-l-2 border-primary' : ''}`}
              >
                <Card glass className="p-5 group hover:border-primary/30">
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${isUnread ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-gray-400 text-gray-600'}`}
                      >
                        {notification.title}
                      </p>
                      {notification.body ? (
                        <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5">{notification.body}</p>
                      ) : null}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(notification.created_at)}
                        </span>
                        {notification.type && (
                          <span className="text-[10px] text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-dark-muted px-2 py-0.5 rounded-full">
                            {notification.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
