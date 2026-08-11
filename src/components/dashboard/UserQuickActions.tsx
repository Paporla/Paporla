'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag, Heart, User, Bell, Store, Sparkles } from 'lucide-react'

const actions = [
  {
    icon: ShoppingBag,
    label: 'Explorar packs',
    href: '/packs',
    color: 'from-primary to-primary/80',
    description: 'Ver ofertas',
  },
  {
    icon: Heart,
    label: 'Favoritos',
    href: '/favorites',
    color: 'from-secondary-dark to-secondary',
    description: 'Comercios guardados',
  },
  {
    icon: User,
    label: 'Mi perfil',
    href: '/profile',
    color: 'from-primary to-primary-dark',
    description: 'Configuración',
  },
  {
    icon: Bell,
    label: 'Alertas',
    href: '/notifications',
    color: 'from-amber-500 to-orange-500',
    description: 'Notificaciones',
  },
  { icon: Store, label: 'Comercios', href: '/shops', color: 'from-green-500 to-emerald-500', description: 'Descubrir' },
  {
    icon: Sparkles,
    label: 'Recomendados',
    href: '/packs',
    color: 'from-primary to-primary-dark',
    description: 'Para ti',
  },
]

export default function UserQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h2 className="text-lg font-semibold dark:text-white text-gray-900">Acciones rápidas</h2>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {actions.map((action, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
          >
            <Link href={action.href}>
              <div className="group glass-card hover:border-primary/30 rounded-2xl p-3 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 h-full flex flex-col items-center justify-center min-h-[90px]">
                <div
                  className={`w-8 h-8 mx-auto mb-2 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <p className="dark:text-white text-gray-900 font-medium text-[11px] leading-tight truncate w-full">
                  {action.label}
                </p>
                <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-0.5 leading-tight truncate w-full">
                  {action.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
