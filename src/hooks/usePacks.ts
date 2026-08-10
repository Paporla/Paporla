'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { PackWithShop } from '@/types/pack'

const PACKS_QUERY_KEY = 'packs'
const supabase = supabaseBrowser()

const PACK_SELECT = `*,shop:shops(id,name,address,city,phone,verified,description,logo_url,latitude,longitude)`

async function fetchPacks(shopId?: string) {
  let query = supabase.from('packs').select(PACK_SELECT).order('created_at', { ascending: false })

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message ?? 'Error al obtener packs')
  }

  return (data ?? []) as PackWithShop[]
}

async function fetchPackById(id: string) {
  const { data, error } = await supabase.from('packs').select(PACK_SELECT).eq('id', id).maybeSingle()

  if (error) {
    throw new Error(error.message ?? 'Error al obtener el pack')
  }

  if (!data) {
    throw new Error('Pack no encontrado')
  }

  return data as PackWithShop
}

export function usePacks(shopId?: string) {
  const query = useQuery({
    queryKey: [PACKS_QUERY_KEY, shopId ?? 'all'],
    queryFn: () => fetchPacks(shopId),
    staleTime: 30 * 1000,
  })

  return {
    packs: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    getPackById: fetchPackById,
  }
}
