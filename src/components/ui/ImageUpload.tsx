'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024

interface ImageUploadProps {
  bucket: 'shop-images' | 'pack-images' | 'avatars'
  path: string
  onUploadComplete: (url: string) => void
  onError?: (error: string) => void
  existingImage?: string | null
  label?: string
  deferUpload?: boolean
  onFileChosen?: (file: File) => void
}

export default function ImageUpload({
  bucket,
  path,
  onUploadComplete,
  onError,
  existingImage,
  label = 'Imagen',
  deferUpload = false,
  onFileChosen,
}: ImageUploadProps) {
  const supabase = supabaseBrowser()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(existingImage ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ALLOWED.includes(file.type)) {
      onError?.('Solo JPEG, PNG o WebP')
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.('La imagen no debe superar los 2 MB')
      return
    }

    if (deferUpload) {
      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)
      onFileChosen?.(file)
      onUploadComplete(localUrl)
      return
    }

    setUploading(true)
    try {
      const fileExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${path.replace(/\/$/, '')}/${fileName}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)

      setPreview(publicUrl)
      onUploadComplete(filePath)
    } catch (error: unknown) {
      logger.error('ImageUpload', error)
      onError?.((error instanceof Error ? error.message : 'Error') || 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
    onFileChosen?.(undefined as unknown as File)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium dark:text-gray-400 text-gray-600">{label}</label>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
              <div className="relative w-full h-40 rounded-xl overflow-hidden dark:bg-gray-800 bg-gray-100">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute inset-0 dark:bg-black/50 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed dark:border-gray-600 border-gray-300 dark:bg-gray-800/30 bg-gray-100 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 dark:text-gray-500 text-gray-400" />
                  <p className="text-sm dark:text-gray-500 text-gray-400">Haz clic para subir imagen</p>
                  <p className="text-xs dark:text-gray-600 text-gray-500">JPEG, PNG o WebP, máximo 2 MB</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
