'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Package } from 'lucide-react'

interface PackImageGalleryProps {
  imageUrl: string | null
  title: string
  discount: number | null
  isAvailable: boolean
}

export default function PackImageGallery({
  imageUrl,
  title,
  discount,
  isAvailable
}: PackImageGalleryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden glass-card">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Package className="w-20 h-20 dark:text-gray-500 text-gray-400" />
          </div>
        )}
        {discount && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            -{discount}%
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 dark:bg-black/60 bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl font-bold text-white">Agotado</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden dark:bg-gray-800 bg-gray-200 cursor-pointer hover:opacity-80 transition relative">
          {imageUrl ? (
            <Image src={imageUrl} alt="Thumb" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
