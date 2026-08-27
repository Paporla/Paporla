'use client'

import { formatRelativeTime } from '@/lib/utils/formatTime'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, XCircle, Info, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info' | 'success'
  title: string
  description: string
  time: string
  action?: string
  actionLink?: string
}

/** Fila de `activity_logs` (0007:210–236): columnas reales del esquema. */
interface ActivityLog {
  id: string
  severity: string
  action: string | null
  target_type: string | null
  occurred_at: string
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
    bg: 'bg-secondary/5',
    border: 'border-secondary/30',
    iconBg: 'bg-secondary/15',
    iconColor: 'text-secondary',
    actionBg: 'bg-secondary/10 hover:bg-secondary/20',
    actionText: 'text-secondary',
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

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = supabaseBrowser()

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true)

      // `activity_logs` no tiene `created_at` ni `title`/`description`: la
      // columna de fecha real es `occurred_at` (0007) y el contenido viene de
      // `action` (qué pasó) y `target_type` (sobre qué). Con los nombres
      // viejos la consulta fallaba siempre (42703) y el panel salía vacío.
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .in('severity', ['warning', 'error', 'critical'])
        .order('occurred_at', { ascending: false })
        .limit(5)

      if (error) {
        logger.error('Admin AlertsPanel', error)
        setAlerts([])
      } else {
        setAlerts(
          (logs ?? []).map((log: ActivityLog) => ({
            id: log.id,
            // Solo llegan warning/error/critical: warning en ámbar y el
            // resto en rojo (un error es tan serio como un crítico aquí).
            level: log.severity === 'warning' ? 'warning' : 'critical',
            title: log.action ?? 'Actividad',
            description: log.target_type ?? '',
            time: formatRelativeTime(log.occurred_at),
            action: 'Ver mas',
            actionLink: '/admin',
          })),
        )
      }
      setLoading(false)
    }

    loadAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
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
    <div className="glass-card rounded-2xl p-6">
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
                className={`${styles.bg} ${styles.border} border rounded-xl p-4 flex items-start gap-3`}
              >
                <div className={`p-2 rounded-lg ${styles.iconBg} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white text-gray-900">{alert.title}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{alert.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {alert.action && alert.actionLink && (
                      <a
                        href={alert.actionLink}
                        className={`text-[10px] font-semibold ${styles.actionText} ${
                          styles.actionBg
                        } px-3 py-1 rounded-lg transition-colors`}
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
