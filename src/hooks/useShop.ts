'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Shop, Pack } from '@/lib/supabase/types'
import { logger } from '@/lib/logger'

const supabase = supabaseBrowser()

interface ShopWithPacks {
  shop: Shop | null
  packs: Pack[]
}

async function fetchShop(shopId: string): Promise<ShopWithPacks> {
  // Cargar comercio
  const { data: shopData, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .eq('banned', false)
    .is('deleted_at', null)
    .maybeSingle()

  if (shopError || !shopData) {
    throw new Error(shopError?.message ?? 'Comercio no encontrado')
  }

  // Cargar packs activos del comercio
  const { data: packsData, error: packsError } = await supabase
    .from('packs')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .gt('remaining_stock', 0)
    .order('created_at', { ascending: false })

  if (packsError) {
    logger.error('useShop loadPacks', packsError)
  }

  return {
    shop: shopData as Shop,
    packs: (packsData as Pack[]) ?? [],
  }
}

export function useShop(shopId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
    staleTime: 30 * 1000,
  })

  return {
    shop: data?.shop ?? null,
    packs: data?.packs ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    reload: refetch,
  }
}
