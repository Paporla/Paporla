'use client';

import { Image, AlertTriangle } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';

interface ProfileImagesFormProps {
  logoUrl: string;
  coverUrl: string;
  onLogoChange: (url: string) => void;
  onCoverChange: (url: string) => void;
  shopId: string;
}

export default function ProfileImagesForm({
  logoUrl,
  coverUrl,
  onLogoChange,
  onCoverChange,
  shopId,
}: ProfileImagesFormProps) {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 lg:p-8 space-y-8">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        Imágenes del comercio
      </h2>

      <ImageUpload
        bucket="shop-images"
        path={`shops/${shopId}/logo`}
        existingImage={logoUrl}
        onUploadComplete={onLogoChange}
        onError={() => {}}
        label="Logo del comercio"
      />

      <ImageUpload
        bucket="shop-images"
        path={`shops/${shopId}/cover`}
        existingImage={coverUrl}
        onUploadComplete={onCoverChange}
        onError={() => {}}
        label="Imagen de portada"
      />

      <div className="bg-black/40 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Las imágenes de alta calidad aumentan las reservas un 40%. Usa fotos reales de tu local.
        </p>
      </div>
    </div>
  );
}