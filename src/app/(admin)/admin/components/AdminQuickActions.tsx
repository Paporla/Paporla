'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Store, Bell, FileText, Shield, AlertTriangle } from 'lucide-react'

const actions = [
  {
    icon: Users,
    label: 'Gestionar usuarios',
    description: 'Ver, editar y cambiar roles',
    href: '/admin/users',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: Store,
    label: 'Verificar comercios',
    description: 'Aprobar, banear o eliminar',
    href: '/admin/shops',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Bell,
    label: 'Notificaciones',
    description: 'Actividad del sistema',
    href: '/admin/notifications',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: FileText,
    label: 'Estadísticas',
    description: 'Análisis y reportes del sistema',
    href: '/admin/stats',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Shield,
    label: 'Roles y permisos',
    description: 'Gestionar roles de usuarios',
    href: '/admin/users',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: AlertTriangle,
    label: 'Panel principal',
    description: 'Vista general y alertas',
    href: '/admin',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
]

export default function AdminQuickActions() {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold dark:text-white text-gray-900">Acciones rapidas</h3>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Gestiona la plataforma rapidamente</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={action.href}
              className={`flex items-center gap-3 p-4 rounded-xl ${
                action.bg
              } dark:hover:bg-white/10 hover:bg-gray-200 dark:border-white/5 border-gray-200 dark:hover:border-white/20 hover:border-gray-300 transition-all duration-200 group text-left w-full`}
            >
              <div className="p-2 rounded-lg dark:bg-black/50 bg-gray-200 group-hover:scale-110 transition-transform">
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium dark:text-white text-gray-900">{action.label}</span>
                </div>
                <p className="text-[10px] dark:text-gray-500 text-gray-400 truncate">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
