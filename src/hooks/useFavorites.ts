'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'

const FAVORITES_QUERY_KEY = 'favorites'
const supabase = supabaseBrowser()

/** Subconjunto de campos de Shop retornados por el join en favorites */
interface FavoriteShopFields {
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

interface FavoriteShop {
  id: string
  shop_id: string
  shop: FavoriteShopFields
}

async function fetchFavorites(userId: string): Promise<FavoriteShop[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`id, shop_id, shop:shops (id, name, address, city, phone, verified, rating, logo_url, cover_url)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as unknown as FavoriteShop[]) ?? []
}

async function addFavorite(userId: string, shopId: string): Promise<void> {
  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    shop_id: shopId,
  })
  if (error) throw new Error(error.message)
}

async function removeFavorite(userId: string, shopId: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('shop_id', shopId)
  if (error) throw new Error(error.message)
}

export function useFavorites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [FAVORITES_QUERY_KEY, user?.id]

  // --- Query: cargar favoritos ---
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFavorites(user!.id),
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const favorites = data
  const favoriteShopIds = new Set(data.map((f) => f.shop_id))

  // --- Mutación: agregar ---
  const addMutation = useMutation({
    mutationFn: (shopId: string) => addFavorite(user!.id, shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // --- Mutación: eliminar ---
  const removeMutation = useMutation({
    mutationFn: (shopId: string) => removeFavorite(user!.id, shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const toggleFavorite = async (shopId: string): Promise<boolean> => {
    if (!user) return false
    try {
      if (favoriteShopIds.has(shopId)) {
        await removeMutation.mutateAsync(shopId)
      } else {
        await addMutation.mutateAsync(shopId)
      }
      return true
    } catch (err) {
      logger.error('useFavorites toggle', err)
      return false
    }
  }

  const isFavorite = (shopId: string) => favoriteShopIds.has(shopId)

  return {
    favorites,
    favoriteShopIds,
    loading: isLoading,
    addFavorite: (shopId: string) => addMutation.mutateAsync(shopId),
    removeFavorite: (shopId: string) => removeMutation.mutateAsync(shopId),
    toggleFavorite,
    isFavorite,
    reload: () => queryClient.invalidateQueries({ queryKey }),
  }
}
