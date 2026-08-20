'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Shop, Pack } from '@/lib/supabase/types'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

interface ShopWithPacks {
  shop: Shop | null
  packs: Pack[]
}

async function fetchShop(shopId: string): Promise<ShopWithPacks> {
  const supabase = supabaseBrowser()

  const { data: shopPayload, error: shopError } = await supabase.rpc('get_public_shop', {
    p_shop_id: shopId,
  })

  if (shopError) throw new Error(shopError.message)

  const raw = (shopPayload as { shop?: Record<string, unknown> } | Record<string, unknown> | null) ?? null
  const row =
    raw && typeof raw === 'object' && 'shop' in raw && raw.shop
      ? (raw.shop as Record<string, unknown>)
      : (raw as Record<string, unknown> | null)

  if (!row || !row.id) {
    throw new Error('Comercio no encontrado')
  }

  const logoPath = (row.logo_path as string | null) ?? null
  const coverPath = (row.cover_path as string | null) ?? null
  const logoUrl = logoPath ? supabase.storage.from('shop-images').getPublicUrl(logoPath).data.publicUrl : null
  const coverUrl = coverPath ? supabase.storage.from('shop-images').getPublicUrl(coverPath).data.publicUrl : null

  const shop = {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: (row.description as string | null) ?? null,
    address: (row.address_line1 as string | null) ?? (row.address as string | null) ?? null,
    city: (row.locality_name as string | null) ?? (row.city as string | null) ?? '',
    phone: (row.phone_e164 as string | null) ?? null,
    logo_url: logoUrl,
    cover_url: coverUrl,
    verified: true,
    rating: row.rating != null ? Number(row.rating) : null,
  } as Shop

  const { data: packRows, error: packsError } = await supabase.rpc('search_available_packs', {
    p_market_id: DEFAULT_MARKET.id,
    p_locality_id: undefined,
    p_latitude: undefined,
    p_longitude: undefined,
    p_radius_meters: 10000,
    p_query: undefined,
    p_limit: 50,
  })

  if (packsError) {
    return { shop, packs: [] }
  }

  const packs = ((packRows ?? []) as Record<string, unknown>[])
    .filter((p) => String(p.shop_id) === shopId)
    .map((p) => {
      const imagePath = (p.image_path as string | null) ?? null
      const imageUrl = imagePath ? supabase.storage.from('pack-images').getPublicUrl(imagePath).data.publicUrl : null
      return {
        id: String(p.pack_id),
        title: String(p.title ?? ''),
        description: (p.description as string | null) ?? null,
        price_cents: Number(p.price_minor ?? 0),
        original_price_cents: p.original_price_minor != null ? Number(p.original_price_minor) : null,
        remaining_stock: Number(p.remaining_stock ?? 0),
        total_stock: Number(p.remaining_stock ?? 0),
        image_url: imageUrl,
        is_active: true,
        shop_id: shopId,
      } as Pack
    })

  return { shop, packs }
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
