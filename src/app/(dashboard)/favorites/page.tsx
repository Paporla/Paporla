'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { Heart, Store, Star, MapPin } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { useState } from 'react'

interface FavoriteShop {
  id: string
  shop_id: string
  shop: {
    id: string
    name: string
    address: string | null
    city: string | null
    phone: string | null
    verified: boolean
    rating: number | null
    logo_url: string | null
    cover_url: string | null
  }
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const queryClient = useQueryClient()
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: favorites = [], isLoading: loading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
          id,
          shop_id,
          shop:shops (
            id,
            name,
            address,
            city,
            phone,
            verified,
            rating,
            logo_url,
            cover_url
          )
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as FavoriteShop[]
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const removeMutation = useMutation({
    mutationFn: async (shopId: string) => {
      if (!user) throw new Error('No autenticado')
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('shop_id', shopId)
      if (error) throw error
    },
    onMutate: async (shopId) => {
      setRemoving(shopId)
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })
      const previous = queryClient.getQueryData<FavoriteShop[]>(['favorites', user?.id])
      queryClient.setQueryData<FavoriteShop[]>(
        ['favorites', user?.id],
        (old) => old?.filter((f) => f.shop_id !== shopId) || [],
      )
      return { previous }
    },
    onError: (_err, _shopId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', user?.id], context.previous)
      }
      setError('Error al eliminar de favoritos')
    },
    onSettled: () => {
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
    },
  })

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
          Guarda tus comercios favoritos para encontrarlos facilmente despues
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
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeMutation.mutate(fav.shop_id)}
                      loading={removing === fav.shop_id}
                      className="p-2"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/shops/${fav.shop.id}`)}
                      className="flex-1"
                    >
                      Ver comercio
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/packs?shop=${fav.shop.id}`)} className="flex-1">
                      Ver packs
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  )
}
