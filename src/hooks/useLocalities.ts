'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

export interface Locality {
  id: string
  name: string
}

// ============================================================================
// Localidades del mercado, para el filtro del catálogo
// ============================================================================
// La lista de ciudades del desplegable estaba escrita a mano:
//
//   cities = ['Santiago']   (valor por defecto de PackFiltersAdvanced)
//
// Funcionaba mientras hubiera una sola comuna, pero Paporla quiere crecer a
// más comunas y a otros países. Habría que acordarse de venir aquí a añadir
// cada ciudad nueva a mano, y si se te olvidaba, la ciudad existía en la base
// pero no salía en el desplegable.
//
// Ahora se leen de la tabla `localities`, que ya existía y ya era legible:
//
//   GRANT SELECT ON TABLE public.markets, public.regions, public.localities
//   TO anon;                                    (migración 0012)
//
// y la política localities_public_read (0011) deja pasar solo las activas de
// un mercado activo. O sea: no hizo falta tocar la base de datos.
// ============================================================================

export function useLocalities() {
  const supabase = supabaseBrowser()

  const query = useQuery({
    queryKey: ['localities', DEFAULT_MARKET.id],
    queryFn: async (): Promise<Locality[]> => {
      const { data, error } = await supabase
        .from('localities')
        .select('id, name')
        .eq('market_id', DEFAULT_MARKET.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw new Error(error.message || 'No se pudieron cargar las localidades')

      return (data ?? []) as Locality[]
    },
    // Las localidades cambian muy poco: no tiene sentido repedirlas. Una hora
    // es de sobra para que una ciudad nueva aparezca sin recargar.
    staleTime: 60 * 60 * 1000,
  })

  return {
    localities: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? '',
  }
}
