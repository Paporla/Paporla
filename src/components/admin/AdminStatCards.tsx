'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Calendar, CheckCircle, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import type { AdminDashboardStats } from './useAdminDashboard'

interface Props { stats: AdminDashboardStats }

const items: Array<{ icon: any; label: string; key: keyof AdminDashboardStats; color: string; bg: string }> = [
  { icon: Package, label: 'Packs Creados', key: 'totalPacks', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Calendar, label: 'Reservas', key: 'totalReservations', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: CheckCircle, label: 'Verificados', key: 'verifiedShops', color: 'text-green-400', bg: 'bg-green-500/10' },
  { icon: XCircle, label: 'Baneados', key: 'bannedShops', color: 'text-red-400', bg: 'bg-red-500/10' },
]

export default function AdminStatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <motion.div key={item.key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.05 }}>
          <Link href="/admin/shops">
            <Card glass className="p-4 cursor-pointer group dark:hover:bg-white/5 hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${item.color}`}>{stats[item.key].toLocaleString()}</div>
                  <div className="text-xs dark:text-gray-400 text-gray-600 mt-1">{item.label}</div>
                </div>
                <div className={`p-2 rounded-lg ${item.bg}`}><item.icon className={`w-5 h-5 ${item.color}`} /></div>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
