'use client';

import { ArrowLeft, MapPin, Phone, Store } from 'lucide-react';

interface ProfilePreviewProps {
  formData: {
    name: string;
    description: string;
    category: string;
    address: string;
    city: string;
    phone: string;
    logoUrl: string;
    coverUrl: string;
  };
  hours: any;
  onBack: () => void;
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
};

export default function ProfilePreview({ formData, hours, onBack }: ProfilePreviewProps) {
  const category = CATEGORIES[formData.category] || { emoji: '🏪' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al editor
        </button>
        <span className="text-xs text-gray-500 bg-black/40 px-3 py-1.5 rounded-full">
          Vista previa — Así ven tu comercio los usuarios
        </span>
      </div>

      <div className="max-w-md mx-auto bg-black/40 border border-white/10 rounded-3xl overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-black/40 to-secondary/20 flex items-center justify-center relative">
          {formData.coverUrl ? (
            <img src={formData.coverUrl} alt="" className="w-full h-full object-cover" />
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
              <img src={formData.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
                {category.emoji}
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">{formData.name || 'Mi Comercio'}</h3>
              <p className="text-xs text-gray-500">{formData.city || 'Sin ciudad'}</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed">
            {formData.description || 'Sin descripción'}
          </p>

          <div className="space-y-2 text-xs text-gray-500">
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
  );
}