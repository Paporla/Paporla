'use client'

import { Image as ImageIcon, AlertTriangle } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'

interface ProfileImagesFormProps {
  logoUrl: string
  coverUrl: string
  onLogoChange: (url: string) => void
  onCoverChange: (url: string) => void
  shopId: string
}

/**
 * Formulario de imágenes del perfil de comercio.
 * Envuelve dos ImageUpload: uno para el logo y otro para la portada.
 * Usa el shopId como prefijo estable para las rutas de subida en Supabase Storage.
 */
export default function ProfileImagesForm({
  logoUrl,
  coverUrl,
  onLogoChange,
  onCoverChange,
  shopId,
}: ProfileImagesFormProps) {
  return (
    <div className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-8">
      <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        Imagenes del comercio
      </h2>

      <ImageUpload
        bucket="shop-images"
        path={`${shopId}/logo`}
        existingImage={logoUrl || null}
        onUploadComplete={onLogoChange}
        onError={() => {}}
        label="Logo del comercio"
      />

      <ImageUpload
        bucket="shop-images"
        path={`${shopId}/cover`}
        existingImage={coverUrl || null}
        onUploadComplete={onCoverChange}
        onError={() => {}}
        label="Imagen de portada"
      />

      <div className="dark:bg-black/40 bg-gray-50 dark:border-white/10 border-gray-200 rounded-xl p-4">
        <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Las imagenes de alta calidad aumentan las reservas un 40%. Usa fotos reales de tu local.
        </p>
      </div>
    </div>
  )
}
