'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Package, Calendar, Store, Copy, BarChart3 } from 'lucide-react';
import Card from '@/components/ui/Card';

const actions = [
  { icon: Plus, label: 'Crear Pack', href: '/business/packs/new', color: 'from-primary to-primary/80', description: 'Nuevo pack sorpresa' },
  { icon: Copy, label: 'Duplicar Pack', href: '/business/packs', color: 'from-purple-500 to-pink-500', description: 'Copiar existente' },
  { icon: Package, label: 'Mis Packs', href: '/business/packs', color: 'from-blue-500 to-cyan-500', description: 'Gestionar packs' },
  { icon: Calendar, label: 'Reservas', href: '/business/reservations', color: 'from-orange-500 to-red-500', description: 'Ver pedidos' },
  { icon: Store, label: 'Mi Comercio', href: '/business/profile', color: 'from-green-500 to-emerald-500', description: 'Editar perfil' },
  { icon: BarChart3, label: 'Estadisticas', href: '/business/analytics', color: 'from-amber-500 to-orange-500', description: 'Analisis completo' },
];

export default function QuickActions() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        Acciones Rápidas
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
          >
            <Link href={action.href}>
              <Card glass hover className="p-4 text-center cursor-pointer group">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-medium text-sm">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}