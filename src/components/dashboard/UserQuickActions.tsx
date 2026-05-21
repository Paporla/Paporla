'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, User, Bell, Store, Sparkles } from 'lucide-react';

const actions = [
  { icon: ShoppingBag, label: 'Explorar packs', href: '/packs', color: 'from-primary to-primary/80', description: 'Ver ofertas' },
  { icon: Heart, label: 'Mis favoritos', href: '/favorites', color: 'from-red-500 to-pink-500', description: 'Comercios guardados' },
  { icon: User, label: 'Mi perfil', href: '/profile', color: 'from-blue-500 to-cyan-500', description: 'Configuracion' },
  { icon: Bell, label: 'Notificaciones', href: '/notifications', color: 'from-amber-500 to-orange-500', description: 'Alertas' },
  { icon: Store, label: 'Ver comercios', href: '/shops', color: 'from-green-500 to-emerald-500', description: 'Descubrir' },
  { icon: Sparkles, label: 'Recomendados', href: '/packs', color: 'from-purple-500 to-pink-500', description: 'Para ti' },
];

export default function UserQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-primary rounded-full" />
        <h2 className="text-lg font-semibold dark:text-white text-gray-900">Acciones rapidas</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
          >
            <Link href={action.href}>
              <div className="group dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 hover:border-primary/30 rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
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
  );
}
