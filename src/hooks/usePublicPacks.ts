'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { PublicPack } from '@/components/packs/PackCardPublic'

interface Filters {
  search: string
  minPrice: number
  maxPrice: number
  showAvailableOnly: boolean
  city: string
  location: { lat: number; lng: number } | null
  radiusKm: number
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'distance'
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  minPrice: 0,
  maxPrice: 100000,
  showAvailableOnly: false,
  city: '',
  location: null,
  radiusKm: 10,
  sortBy: 'newest',
}

export function usePublicPacks() {
  const supabase = supabaseBrowser()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [error, setError] = useState('')

  /**
   * Carga packs usando React Query. Soporta dos modos:
   * - RPC search_packs_nearby (geolocalización)
   * - Vista available_packs (modo normal)
   */
  const { data: allPacks = [], isLoading: loading } = useQuery({
    queryKey: ['public-packs', filters.location?.lat, filters.location?.lng, filters.radiusKm],
    queryFn: async () => {
      setError('')

      if (filters.location) {
        // MODO GEOLOCALIZACIÓN: usar RPC search_packs_nearby
        const radiusMeters = filters.radiusKm * 1000
        const { data, error: rpcError } = await supabase.rpc('search_packs_nearby', {
          p_lat: filters.location.lat,
          p_lng: filters.location.lng,
          p_radius_meters: radiusMeters,
          p_limit: 100,
        })

        if (rpcError) {
          setError(rpcError.message)
          return []
        }
        return (data as PublicPack[]) || []
      }

      // MODO VISTA: usar available_packs con límite
      const { data, error: viewError } = await supabase
        .from('available_packs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (viewError) {
        setError(viewError.message)
        return []
      }
      return (data as PublicPack[]) || []
    },
    staleTime: 30 * 1000,
  })

  /**
   * Filtrado cliente: búsqueda por texto, precio, ciudad, stock.
   */
  const packs = useMemo(() => {
    let result = [...allPacks]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }

    if (filters.minPrice > 0) {
      result = result.filter((p) => p.price_cents >= filters.minPrice)
    }
    if (filters.maxPrice < 100000) {
      result = result.filter((p) => p.price_cents <= filters.maxPrice)
    }

    if (filters.showAvailableOnly) {
      result = result.filter((p) => p.remaining_stock > 0)
    }

    if (filters.city && !filters.location) {
      result = result.filter((p) => p.shop_city === filters.city)
    }

    // Ordenamiento
    if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => a.price_cents - b.price_cents)
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => b.price_cents - a.price_cents)
    } else if (filters.sortBy === 'newest' && filters.location) {
      // Si hay geolocalización activa pero el usuario quiere más recientes
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (filters.sortBy === 'distance' || (filters.location && filters.sortBy !== 'newest')) {
      // Por defecto con geolocalización: ordenar por distancia
      result.sort((a, b) => (a.distance_meters ?? 99999) - (b.distance_meters ?? 99999))
    }
    // 'newest' sin geolocalización ya viene ordenado de la query (created_at DESC)

    return result
  }, [allPacks, filters])

  return {
    allPacks,
    packs,
    filters,
    loading,
    error,
    setError,
    setFilters,
  }
}
