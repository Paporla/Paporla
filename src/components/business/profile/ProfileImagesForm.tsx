'use client'

import { Image as ImageIcon, Package, Check } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'
import { supabaseBrowser } from '@/lib/supabase/client'

interface ProfileImagesFormProps {
  logoUrl: string
  coverUrl: string
  onLogoChange: (url: string) => void
  onCoverChange: (url: string) => void
  /* Foto por defecto de los packs: se configura una vez y la heredan todos. */
  packImageUrl: string
  onPackImageChange: (url: string) => void
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
  packImageUrl,
  onPackImageChange,
  shopId,
}: ProfileImagesFormProps) {
  const hasPackImage = !!packImageUrl

  return (
    <div className="space-y-6">
      {/*
        La foto de los packs va primero y en su propia tarjeta: es la que le
        ahorra trabajo al comercio en cada publicacion, asi que no debe quedar
        sepultada bajo el logo y la portada.
      */}
      <div className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Foto por defecto de tus packs
          </h2>
          {hasPackImage && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              <Check className="w-3.5 h-3.5" />
              Configurada
            </span>
          )}
        </div>

        <p className="text-sm dark:text-gray-400 text-gray-600">
          Súbela una sola vez y todos tus packs la usarán automáticamente. Así no tienes que buscar una foto cada vez
          que publicas. Puedes cambiarla cuando quieras desde aquí.
        </p>

        <ImageUpload
          bucket="shop-images"
          path={`${shopId}/pack-default`}
          existingImage={toPreview('shop-images', packImageUrl)}
          onUploadComplete={onPackImageChange}
          onError={() => {}}
          label="Foto para tus packs (JPEG, PNG o WebP, máx. 2 MB)"
        />

        {!hasPackImage && (
          <p className="text-xs dark:text-amber-400 text-amber-600">
            Sin esta foto tendrás que subir una imagen en cada pack que publiques.
          </p>
        )}

        <p className="text-xs dark:text-gray-500 text-gray-400">
          Consejo: una foto del producto real, bien iluminada y de cerca, funciona mejor que una del local.
        </p>
      </div>

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
    </div>
  )
}
