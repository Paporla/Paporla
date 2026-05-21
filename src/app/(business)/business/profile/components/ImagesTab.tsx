'use client';

import { Image, AlertTriangle } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';

interface ImagesTabProps {
  formData: any;
  updateForm: (field: string, value: string) => void;
  bucket?: string;
}

export default function ImagesTab({ formData, updateForm, bucket = 'shop-images' }: ImagesTabProps) {
  return (
    <div className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-8">
      <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        Imagenes del comercio
      </h2>
      <ImageUpload bucket="shop-images" path={`shops/${Date.now()}/logo`} existingImage={formData.logoUrl} onUploadComplete={(url) => updateForm('logoUrl', url)} onError={() => {}} label="Logo del comercio" />
      <ImageUpload bucket="shop-images" path={`shops/${Date.now()}/cover`} existingImage={formData.coverUrl} onUploadComplete={(url) => updateForm('coverUrl', url)} onError={() => {}} label="Imagen de portada" />
      <div className="dark:bg-black/40 bg-gray-50 dark:border-white/10 border-gray-200 rounded-xl p-4">
        <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" />Las imagenes de alta calidad aumentan las reservas un 40%. Usa fotos reales de tu local.</p>
      </div>
    </div>
  );
}
