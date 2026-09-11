'use client'

import { Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'
import { useState } from 'react'

interface FavoriteButtonProps {
  shopId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showAnimation?: boolean
}

export default function FavoriteButton({
  shopId,
  size = 'md',
  className = '',
  showAnimation = true,
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { isFavorite, toggleFavorite } = useFavorites()
  // Lote UX punto 4: el aviso viaja al ToastProvider global. Dos mejoras de
  // paso: (1) el provider vive en la raíz, así que el mensaje SOBREVIVE al
  // salto a /login (antes el toast moría con este componente a los 1,5 s);
  // (2) ya no hay temporizador propio de 2 s duplicando el del provider.
  const { addToast } = useToast()
  const [isAnimating, setIsAnimating] = useState(false)

  const isFav = isFavorite(shopId)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      // 'info', no 'success': no es un logro, es un aviso de que falta sesión.
      addToast('Inicia sesión para guardar favoritos', 'info')
      setTimeout(() => router.push('/login'), 1500)
      return
    }

    setIsAnimating(true)
    const success = await toggleFavorite(shopId)

    if (success) {
      addToast(isFav ? 'Eliminado de favoritos' : 'Comercio guardado en favoritos', 'success')
    }

    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={
        isAnimating && showAnimation
          ? {
              scale: [1, 1.3, 1],
              transition: { duration: 0.3 },
            }
          : {}
      }
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        isFav ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'
      } ${className}`}
    >
      <Heart
        className={`${iconSizes[size]} transition-all ${
          isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'
        }`}
      />
    </motion.button>
  )
}
