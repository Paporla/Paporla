'use client';

import { motion } from 'framer-motion';
import { Store, Building2, MapPin, Clock, Settings, Image, Eye, Shield } from 'lucide-react';

export interface ProfileTab {
  id: string;
  label: string;
  icon: any;
}

export const profileTabs: ProfileTab[] = [
  { id: 'info', label: 'Información', icon: Building2 },
  { id: 'images', label: 'Imágenes', icon: Image },
  { id: 'location', label: 'Ubicación', icon: MapPin },
  { id: 'hours', label: 'Horarios', icon: Clock },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

interface BusinessProfileLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  shopName: string;
  verified: boolean;
  completionPercentage: number;
  onPreview: () => void;
}

export default function BusinessProfileLayout({
  activeTab,
  onTabChange,
  children,
  shopName,
  verified,
  completionPercentage,
  onPreview,
}: BusinessProfileLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Perfil del Comercio</h1>
              <p className="text-sm text-gray-400 mt-1">Gestiona la información pública de tu negocio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2">
              <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Perfil completado</p>
                <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
                </div>
              </div>
            </div>
            <button
              onClick={onPreview}
              className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white hover:border-primary/30 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Vista previa</span>
            </button>
          </div>
        </div>
        {!verified && (
          <div className="mt-4 flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-300">
              <span className="font-semibold">Pendiente de verificación</span> — Tu comercio será revisado en las próximas 24-48 horas.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/40 p-1 rounded-xl overflow-x-auto">
        {profileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                isActive
                  ? 'bg-black/60 text-white shadow-lg border border-white/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}