'use client';

import { motion } from 'framer-motion';
import { Package, Search, Filter, AlertCircle, Store, Heart, Bell, Users, Inbox } from 'lucide-react';

interface EmptyStateProps {
  type?: 'packs' | 'search' | 'filters' | 'reservations' | 'shops' | 'favorites' | 'notifications' | 'users' | 'generic';
  icon?: any;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

const emptyStateConfig: Record<string, { icon: any; title: string; description: string }> = {
  packs: {
    icon: Package,
    title: 'No hay packs disponibles',
    description: 'Actualmente no hay packs publicados. Vuelve pronto para descubrir nuevas ofertas.',
  },
  search: {
    icon: Search,
    title: 'No encontramos resultados',
    description: 'Intenta con otros terminos o revisa los filtros aplicados.',
  },
  filters: {
    icon: Filter,
    title: 'No hay packs con estos filtros',
    description: 'Prueba ajustando el rango de precios o desactivando algunos filtros.',
  },
  reservations: {
    icon: AlertCircle,
    title: 'No tienes reservas activas',
    description: 'Explora los packs disponibles y comienza a ahorrar mientras ayudas al planeta.',
  },
  shops: {
    icon: Store,
    title: 'No hay comercios disponibles',
    description: 'Aun no hay comercios registrados en tu zona.',
  },
  favorites: {
    icon: Heart,
    title: 'Sin favoritos',
    description: 'Agrega comercios a favoritos para acceder rapidamente.',
  },
  notifications: {
    icon: Bell,
    title: 'Sin notificaciones',
    description: 'No tienes notificaciones nuevas. Te avisaremos cuando algo importante suceda.',
  },
  users: {
    icon: Users,
    title: 'Sin usuarios',
    description: 'No hay usuarios que coincidan con la busqueda.',
  },
  generic: {
    icon: Inbox,
    title: 'Sin datos',
    description: 'No hay informacion disponible en este momento.',
  },
};

export default function EmptyState({ type, icon: customIcon, title: customTitle, description: customDescription, action, compact }: EmptyStateProps) {
  const config = type ? emptyStateConfig[type] : emptyStateConfig.generic;
  const Icon = customIcon || config.icon;
  const title = customTitle || config.title;
  const description = customDescription || config.description;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center text-center py-8 px-4"
      >
        <div className="p-3 rounded-full bg-primary/10 mb-3">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {title}
        </h3>
        
        <p className="text-gray-400 mb-6 text-sm">
          {description}
        </p>
        
        {action && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold hover:opacity-90 transition-all duration-200 text-sm"
          >
            {action.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
