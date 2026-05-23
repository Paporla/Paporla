'use client'

import Image from 'next/image'
import { ArrowLeft, MapPin, Phone } from 'lucide-react'

interface ProfilePreviewProps {
  formData: {
    name: string
    description: string
    category: string
    address: string
    city: string
    phone: string
    logoUrl: string
    coverUrl: string
  }
  hours: Record<string, { open: string; close: string; closed: boolean }>
  onBack: () => void
}

const CATEGORIES: Record<string, { emoji: string }> = {
  bakery: { emoji: '🥐' },
  restaurant: { emoji: '🍽️' },
  cafe: { emoji: '☕' },
  pizzeria: { emoji: '🍕' },
  sushi: { emoji: '🍣' },
  fruit: { emoji: '🥭' },
  pastry: { emoji: '🍰' },
  supermarket: { emoji: '🛒' },
  fastfood: { emoji: '🍔' },
  other: { emoji: '🏪' },
}

export default function ProfilePreview({ formData, hours: _hours, onBack }: ProfilePreviewProps) {
  const category = CATEGORIES[formData.category] || { emoji: '🏪' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al editor
        </button>
        <span className="text-xs dark:text-gray-500 text-gray-400 dark:bg-black/40 bg-gray-100 px-3 py-1.5 rounded-full">
          Vista previa -- Asi ven tu comercio los usuarios
        </span>
      </div>

      <div className="max-w-md mx-auto dark:bg-black/40 bg-white dark:border-white/10 border-gray-200 rounded-3xl overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-black/40 to-secondary/20 flex items-center justify-center relative">
          {formData.coverUrl ? (
            <Image
              src={formData.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 448px"
            />
          ) : (
            <span className="text-5xl">{category.emoji}</span>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300">Abierto ahora</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {formData.logoUrl ? (
              <Image
                src={formData.logoUrl}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
                {category.emoji}
              </div>
            )}
            <div>
              <h3 className="font-bold dark:text-white text-gray-900">{formData.name || 'Mi Comercio'}</h3>
              <p className="text-xs dark:text-gray-500 text-gray-400">{formData.city || 'Sin ciudad'}</p>
            </div>
          </div>

          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">
            {formData.description || 'Sin descripcion'}
          </p>

          <div className="space-y-2 text-xs dark:text-gray-500 text-gray-400">
            {formData.address && (
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {formData.address}
              </p>
            )}
            {formData.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                {formData.phone}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-2">Packs disponibles</p>
            <p className="text-xs text-gray-400 text-center py-4">Próximamente...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
