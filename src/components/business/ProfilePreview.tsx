'use client'

import Image from 'next/image'
import { ArrowLeft, MapPin, Phone, Store } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'

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

function publicUrl(stored: string) {
  if (!stored) return null
  if (stored.startsWith('http') || stored.startsWith('blob:')) return stored
  return supabaseBrowser().storage.from('shop-images').getPublicUrl(stored).data.publicUrl
}

export default function ProfilePreview({ formData, hours: _hours, onBack }: ProfilePreviewProps) {
  const coverSrc = publicUrl(formData.coverUrl)
  const logoSrc = publicUrl(formData.logoUrl)

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
          Vista previa — así te ven en Paporla
        </span>
      </div>

      <div className="max-w-md mx-auto dark:bg-black/40 bg-white dark:border-white/10 border-gray-200 rounded-3xl overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-black/40 to-secondary/20 relative">
          {coverSrc ? (
            <Image src={coverSrc} alt="" fill className="object-cover" sizes="448px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <Image src={logoSrc} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-bold dark:text-white text-gray-900">{formData.name || 'Mi Comercio'}</h3>
              <p className="text-xs dark:text-gray-500 text-gray-400">{formData.city || 'Santiago'}</p>
            </div>
          </div>

          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">
            {formData.description || 'Sin descripción'}
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
        </div>
      </div>
    </div>
  )
}
