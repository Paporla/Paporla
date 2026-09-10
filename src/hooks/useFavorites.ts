'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'

/**
 * Favoritos, versión Lote F1 (2026-09-10).
 *
 * ANTES: este hook hablaba directo con la tabla `favorites` (INSERT/DELETE) y
 * hacía un join a `shops` pidiendo columnas que no existen (city, verified,
 * rating, logo_url...). authenticated no tiene GRANT sobre esas tablas —todo
 * pasa por funciones SECURITY DEFINER a propósito—, así que cada operación
 * moría con 42501 y el error se tragaba: el corazón no hacía nada (L-06,
 * confirmado por Sentry en producción el 2026-09-09).
 *
 * AHORA: lectura por `list_my_favorites` (migración 0043) y escritura por
 * `set_favorite` (migración 0009), las dos con su GRANT a authenticated.
 * Las URLs públicas de logo/portada se resuelven en el cliente con el bucket
 * `shop-images`, igual que en useShops.
 */

const FAVORITES_QUERY_KEY = 'favorites'

/** Subconjunto de campos de Shop que consume la página de favoritos. */
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

/** Fila tal como la devuelve list_my_favorites (0043). */
interface ListMyFavoritesRow {
  favorite_id: string
  shop_id: string
  favorited_at: string
  name: string
  category: string | null
  locality_name: string | null
  address: string | null
  phone_e164: string | null
  verified: boolean
  rating: number | string | null
  rating_count: number
  logo_path: string | null
  cover_path: string | null
  shop_status: string
}

async function fetchFavorites(): Promise<FavoriteShop[]> {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.rpc('list_my_favorites')
  if (error) throw new Error(error.message)

  return ((data ?? []) as ListMyFavoritesRow[]).map((row) => ({
    id: row.favorite_id,
    shop_id: row.shop_id,
    shop: {
      id: row.shop_id,
      name: row.name,
      address: row.address,
      city: row.locality_name,
      phone: row.phone_e164,
      verified: row.verified,
      rating: row.rating != null ? Number(row.rating) : null,
      logo_url: row.logo_path ? supabase.storage.from('shop-images').getPublicUrl(row.logo_path).data.publicUrl : null,
      cover_url: row.cover_path
        ? supabase.storage.from('shop-images').getPublicUrl(row.cover_path).data.publicUrl
        : null,
    },
  }))
}

async function setFavorite(shopId: string, enabled: boolean): Promise<void> {
  const supabase = supabaseBrowser()
  const { error } = await supabase.rpc('set_favorite', { p_shop_id: shopId, p_enabled: enabled })
  if (error) throw new Error(error.message)
}

export function useFavorites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [FAVORITES_QUERY_KEY, user?.id]

  // --- Query: cargar favoritos ---
  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFavorites(),
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const favorites = data
  const favoriteShopIds = new Set(data.map((f) => f.shop_id))

  // --- Mutación: agregar ---
  const addMutation = useMutation({
    mutationFn: (shopId: string) => setFavorite(shopId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // --- Mutación: eliminar ---
  const removeMutation = useMutation({
    mutationFn: (shopId: string) => setFavorite(shopId, false),
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
