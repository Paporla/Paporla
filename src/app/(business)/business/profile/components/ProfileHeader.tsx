'use client'

import { Store, Shield, Eye } from 'lucide-react'

interface ProfileHeaderProps {
  shopName: string
  verified: boolean
  completionPercentage: number
  onPreview: () => void
}

export default function ProfileHeader({
  shopName: _shopName,
  verified,
  completionPercentage,
  onPreview,
}: ProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Store className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-gray-900">Perfil del Comercio</h1>
            <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
              Gestiona la informacion publica de tu negocio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 dark:bg-black/40 bg-gray-100 dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
            <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
            </div>
            <div>
              <p className="text-[10px] dark:text-gray-500 text-gray-400">Perfil completado</p>
              <div className="w-20 h-1.5 dark:bg-white/10 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={onPreview}
            className="flex items-center gap-2 dark:bg-black/40 bg-gray-100 dark:border-white/10 border-gray-200 rounded-xl px-4 py-2 text-sm dark:text-gray-400 text-gray-600 hover:dark:text-white hover:text-gray-900 hover:border-primary/30 transition-all"
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
            <span className="font-semibold">Pendiente de verificacion</span> -- Tu comercio sera revisado en las
            proximas 24-48 horas.
          </p>
        </div>
      )}
    </div>
  )
}
