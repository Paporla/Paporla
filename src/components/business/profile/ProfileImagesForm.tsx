'use client'

import { Image as ImageIcon } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'
import { supabaseBrowser } from '@/lib/supabase/client'

interface ProfileImagesFormProps {
  logoUrl: string
  coverUrl: string
  onLogoChange: (url: string) => void
  onCoverChange: (url: string) => void
  shopId: string
}

function toPreview(bucket: 'shop-images', stored: string) {
  if (!stored) return null
  if (stored.startsWith('http') || stored.startsWith('blob:')) return stored
  return supabaseBrowser().storage.from(bucket).getPublicUrl(stored).data.publicUrl
}

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
        Imágenes del comercio
      </h2>

      <ImageUpload
        bucket="shop-images"
        path={`${shopId}/logo`}
        existingImage={toPreview('shop-images', logoUrl)}
        onUploadComplete={onLogoChange}
        onError={() => {}}
        label="Logo del comercio (JPEG, PNG o WebP, máx. 2 MB)"
      />

      <ImageUpload
        bucket="shop-images"
        path={`${shopId}/cover`}
        existingImage={toPreview('shop-images', coverUrl)}
        onUploadComplete={onCoverChange}
        onError={() => {}}
        label="Imagen de portada"
      />

      <p className="text-xs dark:text-gray-500 text-gray-400">
        Usa fotos reales del local. El logo y la portada se verán en tu ficha pública.
      </p>
    </div>
  )
}
