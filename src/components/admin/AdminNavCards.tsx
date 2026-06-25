'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Store, TrendingUp, Bell, ChevronRight, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import type { AdminDashboardStats } from './useAdminDashboard'

interface Props {
  stats: AdminDashboardStats
  loading?: boolean
  error?: string
}

interface NavCard {
  icon: React.ComponentType<{ className?: string }>
  label: string
  key: keyof AdminDashboardStats | null
  href: string
  color: string
  bg: string
  description: string
}

const navCards: NavCard[] = [
  {
    icon: Users,
    label: 'Usuarios',
    key: 'totalUsers',
    href: '/admin/users',
    color: 'text-primary',
    bg: 'bg-primary/10',
    description: 'Gestionar usuarios',
  },
  {
    icon: Store,
    label: 'Comercios',
    key: 'totalShops',
    href: '/admin/shops',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    description: 'Gestionar comercios',
  },
  {
    icon: TrendingUp,
    label: 'Estadisticas',
    key: null,
    href: '/admin/stats',
    color: 'text-primary',
    bg: 'bg-primary/10',
    description: 'Analisis detallado',
  },
  {
    icon: Bell,
    label: 'Notificaciones',
    key: null,
    href: '/admin/notifications',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    description: 'Actividad en tiempo real',
  },
]

function getValue(stats: AdminDashboardStats, key: keyof AdminDashboardStats | null): string {
  if (!key) return 'Ver mas'
  return (stats?.[key] ?? 0).toLocaleString()
}

export default function AdminNavCards({ stats, loading, error }: Props) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {navCards.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link href={item.href}>
            <Card glass hover className="p-6 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${item.color} mb-2`}>{getValue(stats, item.key)}</div>
                  <div className="dark:text-gray-400 text-gray-600 text-sm font-medium">{item.label}</div>
                  <div className="text-xs dark:text-gray-500 text-gray-400 mt-1">{item.description}</div>
                </div>
                <div className={`p-3 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
              </div>
              <div className="mt-4 text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                Gestionar <ChevronRight className="w-3 h-3" />
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
