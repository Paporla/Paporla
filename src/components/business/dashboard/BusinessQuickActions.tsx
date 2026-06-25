'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Package, Calendar, Store, BarChart3 } from 'lucide-react'

const actions = [
  {
    icon: Plus,
    label: 'Crear Pack',
    href: '/business/packs/new',
    color: 'from-primary to-primary/80',
    description: 'Nuevo pack sorpresa',
    bg: 'bg-primary/10',
  },
  {
    icon: Package,
    label: 'Mis Packs',
    href: '/business/packs',
    color: 'from-blue-500 to-cyan-500',
    description: 'Gestionar packs',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Calendar,
    label: 'Reservas',
    href: '/business/reservations',
    color: 'from-orange-500 to-red-500',
    description: 'Ver pedidos',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Store,
    label: 'Mi Perfil',
    href: '/business/profile',
    color: 'from-green-500 to-emerald-500',
    description: 'Editar perfil',
    bg: 'bg-green-500/10',
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/business/analytics',
    color: 'from-amber-500 to-orange-500',
    description: 'Ver metricas',
    bg: 'bg-amber-500/10',
  },
]

export default function BusinessQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h2 className="text-lg font-semibold dark:text-white text-gray-900">Acciones rapidas</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            className="h-full"
          >
            <Link href={action.href} className="block h-full">
              <div className="group h-full flex flex-col items-center justify-center dark:bg-[#0f0f1a] bg-white border dark:border-white/10 border-gray-200 hover:border-primary/30 rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className="dark:text-white text-gray-900 font-medium text-sm">{action.label}</p>
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
