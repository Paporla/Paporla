'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { PackWithShop } from '@/types/pack'

const PACKS_QUERY_KEY = 'packs'

async function fetchPacks(shopId?: string, client = supabaseBrowser()) {
  let query = client
    .from('packs')
    .select('*,shop:shops(name,address,phone,verified)')
    .eq('is_active', true)
    .gt('remaining_stock', 0)

  if (shopId) query = query.eq('shop_id', shopId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data as PackWithShop[]
}

async function fetchPackById(id: string) {
  const { data, error } = await supabaseBrowser()
    .from('packs')
    .select('*,shop:shops(name,address,phone,verified,description)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
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
