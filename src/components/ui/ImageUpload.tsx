'use client';

import Image from 'next/image'
import { useState, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadProps {
  bucket: 'shop-images' | 'pack-images' | 'avatars';
  path: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  existingImage?: string | null;
  label?: string;
}

export default function ImageUpload({ 
  bucket, 
  path, 
  onUploadComplete, 
  onError, 
  existingImage,
  label = 'Imagen'
}: ImageUploadProps) {
  const supabase = supabaseBrowser();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      onError?.('Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('La imagen no debe superar los 5MB');
      return;
    }

    setUploading(true);

    try {
      // Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      onError?.(error.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-400">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group"
            >
                            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-800">
                <Image 
                  src={preview} 
                  alt="Preview" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    disabled={uploading}
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed border-white/20 bg-white/5 hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-500" />
                  <p className="text-sm text-gray-500">Haz clic para subir imagen</p>
                  <p className="text-xs text-gray-600">JPG, PNG, GIF hasta 5MB</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}