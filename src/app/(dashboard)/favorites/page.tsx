'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { Heart, Store, Star, MapPin, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { useState } from 'react'

export default function FavoritesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { favorites, loading, removeFavorite } = useFavorites()
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleRemove = async (shopId: string) => {
    setRemoving(shopId)
    setError('')
    try {
      await removeFavorite(shopId)
    } catch {
      setError('Error al eliminar de favoritos')
    }
    setRemoving(null)
  }

  // SPINNER
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="dark:text-gray-400 text-gray-600 text-lg font-medium">Cargando favoritos...</p>
          <p className="dark:text-gray-600 text-gray-400 text-sm mt-1">Por favor espera</p>
        </div>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">No tienes favoritos</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-6">
          Guarda tus comercios favoritos para encontrarlos fácilmente después
        </p>
        <Button onClick={() => router.push('/shops')}>
          <Store className="w-4 h-4 mr-2" />
          Explorar comercios
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Mis Favoritos</h1>
          </div>
          <p className="dark:text-gray-400 text-gray-600">
            {favorites.length} {favorites.length === 1 ? 'comercio guardado' : 'comercios guardados'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favorites.map((fav, idx) => (
          <motion.div
            key={fav.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card glass className="p-4 group hover:border-primary/30 transition-all">
              <div className="flex gap-4">
                {/* Fix: agregado "relative" para que Image fill funcione correctamente */}
                <div className="relative w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {fav.shop.logo_url ? (
                    <Image
                      src={fav.shop.logo_url}
                      alt={fav.shop.name}
                      fill
                      className="object-cover rounded-xl"
                      sizes="64px"
                    />
                  ) : (
                    <Store className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        onClick={() => router.push(`/shops/${fav.shop.id}`)}
                        className="font-bold dark:text-white text-gray-900 hover:text-primary transition-colors cursor-pointer line-clamp-1"
                      >
                        {fav.shop.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-400">{fav.shop.rating?.toFixed(1) || 'Nuevo'}</span>
                        {fav.shop.verified && (
                          <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                            Verificado
                          </span>
                        )}
                      </div>
                      {fav.shop.address && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{fav.shop.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(fav.shop_id)}
                  loading={removing === fav.shop_id}
                  className="p-2 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  )
}
