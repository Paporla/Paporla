'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DEFAULT_MARKET } from '@/lib/constants/markets'
import { useLocalities } from '@/hooks/useLocalities'
import type { Database } from '@/types/database.generated'
import type { PublicPack } from '@/components/packs/PackCardPublic'

type SearchPackRow = Database['public']['Functions']['search_available_packs']['Returns'][number]

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
  const [localError, setError] = useState('')

  // La lista de ciudades del desplegable viene de la base de datos, no escrita
  // a mano. useLocalities trae { id, name }; el desplegable muestra el nombre y
  // aquí se traduce a id, que es lo que la RPC necesita.
  const { localities } = useLocalities()

  /**
   * El filtro guarda el NOMBRE de la localidad (es lo que ve el usuario y lo
   * que se muestra en los "chips" de filtros activos); la RPC quiere el id.
   *
   * Si el nombre no encuentra id — una ciudad dada de baja, o un filtro viejo
   * en la URL — devolvemos null y NO filtramos. Enseñar todos los packs es un
   * fallo mucho mejor que enseñar cero: el usuario ve que hay cosas y puede
   * quitar el filtro.
   */
  const localityId = useMemo(() => {
    if (!filters.city) return null
    return localities.find((l) => l.name === filters.city)?.id ?? null
  }, [filters.city, localities])

  const query = useQuery({
    queryKey: [
      'public-packs',
      DEFAULT_MARKET.id,
      filters.search,
      filters.location?.lat,
      filters.location?.lng,
      filters.radiusKm,
      localityId,
    ],
    queryFn: async (): Promise<PublicPack[]> => {
      const { data, error } = await supabase.rpc('search_available_packs', {
        p_market_id: DEFAULT_MARKET.id,
        // Antes iba `undefined` y el filtro se hacía en el navegador sobre los
        // 50 packs que devolvía el límite. Con más de 50 packs en el catálogo,
        // filtrar por ciudad podía dar cero resultados aunque sí hubiera packs
        // en esa ciudad. Ahora filtra la base de datos, que ve todo el catálogo.
        p_locality_id: localityId ?? undefined,
        p_latitude: filters.location?.lat,
        p_longitude: filters.location?.lng,
        p_radius_meters: Math.round(filters.radiusKm * 1000),
        p_query: filters.search.trim() || undefined,
        p_limit: 50,
      })

      if (error) throw new Error(error.message || 'No se pudieron cargar los packs')

      return ((data ?? []) as SearchPackRow[]).map((row) => {
        const imageUrl = row.image_path
          ? supabase.storage.from('pack-images').getPublicUrl(row.image_path).data.publicUrl
          : null

        return {
          id: row.pack_id,
          shop_id: row.shop_id,
          locality_id: row.locality_id,
          title: row.title,
          description: row.description,
          category: row.category,
          tags: row.tags,
          allergen_notice: row.allergen_notice,
          price_minor: row.price_minor,
          original_price_minor: row.original_price_minor,
          currency_code: row.currency_code,
          remaining_stock: row.remaining_stock,
          pickup_start_at: row.pickup_start_at,
          pickup_end_at: row.pickup_end_at,
          timezone: row.timezone,
          image_url: imageUrl,
          shop_name: row.shop_name,
          shop_category: row.shop_category,
          locality_name: row.locality_name,
          shop_address: row.shop_address,
          shop_latitude: row.shop_latitude,
          shop_longitude: row.shop_longitude,
          shop_rating: row.shop_rating,
          shop_rating_count: row.shop_rating_count,
          distance_meters: row.distance_meters,
        }
      })
    },
    /*
     * El catálogo lo mira el cliente, y lo que ve tiene que existir de verdad.
     *
     * Un pack puede pausarse, agotarse o caducar en cualquier momento mientras
     * alguien tiene la pestaña abierta. Con `refetchOnWindowFocus` desactivado
     * (el valor por defecto del provider), al volver a la pestaña seguía viendo
     * la lista guardada: packs que ya no están a la venta. La reserva fallaba
     * después, en la base de datos, con un error que el cliente no entiende.
     *
     * Aquí sí refrescamos al recuperar el foco. 30 s de `staleTime` evitan que
     * cada cambio de pestaña dispare una consulta.
     */
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const allPacks = useMemo(() => query.data ?? [], [query.data])
  const packs = useMemo(() => {
    let result = [...allPacks]

    if (filters.minPrice > 0) {
      result = result.filter((pack) => pack.price_minor >= filters.minPrice)
    }
    if (filters.maxPrice < DEFAULT_FILTERS.maxPrice) {
      result = result.filter((pack) => pack.price_minor <= filters.maxPrice)
    }
    if (filters.showAvailableOnly) {
      result = result.filter((pack) => pack.remaining_stock > 0)
    }
    // Antes aquí se filtraba por ciudad comparando nombres, sobre los 50 packs
    // que devolvía el límite. Ya no: la ciudad se manda a la base de datos como
    // p_locality_id y ella devuelve solo lo que toca. Mantener las dos cosas
    // sería pedirle al navegador que vuelva a comprobar lo que ya comprobó la
    // base, y si algún día el nombre y el id no cuadran, daría cero resultados.

    if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => a.price_minor - b.price_minor)
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => b.price_minor - a.price_minor)
    } else if (filters.sortBy === 'distance') {
      result.sort(
        (a, b) => (a.distance_meters ?? Number.MAX_SAFE_INTEGER) - (b.distance_meters ?? Number.MAX_SAFE_INTEGER),
      )
    } else {
      result.sort((a, b) => new Date(a.pickup_start_at).getTime() - new Date(b.pickup_start_at).getTime())
    }

    return result
  }, [allPacks, filters])

  return {
    allPacks,
    packs,
    // La página las necesita para rellenar el desplegable de ciudades.
    localities,
    filters,
    loading: query.isLoading,
    error: localError || query.error?.message || '',
    setError,
    setFilters,
    // L-22: la página necesita una vía para reintentar tras un fallo de red;
    // sin esto el estado de error honesto sería un callejón sin salida.
    retry: () => {
      void query.refetch()
    },
  }
}
