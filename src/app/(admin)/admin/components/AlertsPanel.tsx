'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Clock, XCircle, Info, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info' | 'success'
  title: string
  description: string
  time: string
  action?: string
  actionLink?: string
}

const levelStyles = {
  critical: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/30',
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
    actionBg: 'bg-red-500/10 hover:bg-red-500/20',
    actionText: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    actionBg: 'bg-amber-500/10 hover:bg-amber-500/20',
    actionText: 'text-amber-400',
  },
  info: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    actionBg: 'bg-blue-500/10 hover:bg-blue-500/20',
    actionText: 'text-blue-400',
  },
  success: {
    bg: 'bg-green-500/5',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-400',
    actionBg: 'bg-green-500/10 hover:bg-green-500/20',
    actionText: 'text-green-400',
  },
}

const getIcon = (level: string) => {
  switch (level) {
    case 'critical':
      return XCircle
    case 'warning':
      return AlertTriangle
    case 'success':
      return CheckCircle
    default:
      return Info
  }
}

const formatTime = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return 'Hace ' + minutes + ' min'
  if (hours < 24) return 'Hace ' + hours + ' h'
  return 'Hace ' + days + ' d'
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = supabaseBrowser()

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true)

      // Get recent critical/warning activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .in('severity', ['warning', 'error', 'critical'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (logs && logs.length > 0) {
        const mappedAlerts: Alert[] = logs.map(
          (log: { id: string; severity: string; title: string; description: string | null; created_at: string }) => ({
            id: log.id,
            level: log.severity === 'critical' ? 'critical' : log.severity === 'warning' ? 'warning' : 'info',
            title: log.title,
            description: log.description || '',
            time: formatTime(log.created_at),
            action: 'Ver mas',
            actionLink: '/admin',
          }),
        )
        setAlerts(mappedAlerts)
      } else {
        setAlerts([])
      }
      setLoading(false)
    }

    loadAlerts()
  }, [])

  if (loading) {
    return (
      <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 dark:bg-gray-800 bg-gray-200 rounded" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 dark:bg-gray-800 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-900">Alertas</h3>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Eventos que requieren atencion</p>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
          <p className="dark:text-gray-500 text-gray-400 text-sm">No hay alertas activas</p>
          <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">Todo esta funcionando correctamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const styles = levelStyles[alert.level]
            const Icon = getIcon(alert.level)
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={styles.bg + ' ' + styles.border + ' border rounded-xl p-4 flex items-start gap-3'}
              >
                <div className={'p-2 rounded-lg ' + styles.iconBg + ' flex-shrink-0'}>
                  <Icon className={'w-4 h-4 ' + styles.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white text-gray-900">{alert.title}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {alert.action && alert.actionLink && (
                      <a
                        href={alert.actionLink}
                        className={
                          'text-[10px] font-semibold ' +
                          styles.actionText +
                          ' ' +
                          styles.actionBg +
                          ' px-3 py-1 rounded-lg transition-colors'
                        }
                      >
                        {alert.action}
                      </a>
                    )}
                    <span className="flex items-center gap-1 text-[10px] dark:text-gray-600 text-gray-500">
                      <Clock className="w-3 h-3" />
                      {alert.time}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
