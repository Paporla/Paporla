'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface BusinessShop {
  id: string
  name: string
  verified: boolean
  status: string
  logo_url: string | null
  description: string | null
  address: string | null
  city: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
}

type GetMyShopResult = {
  shop?: {
    id: string
    name: string
    status: string
    logo_path: string | null
    description: string | null
    address_line1: string | null
    phone_e164: string | null
    latitude: number | null
    longitude: number | null
    locality_id: string | null
  } | null
} | null

export function useBusinessShop() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['business-shop', user?.id],
    queryFn: async (): Promise<BusinessShop | null> => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('get_my_shop')
      if (error) throw error

      const payload = data as GetMyShopResult
      const shop = payload?.shop
      if (!shop?.id) return null

      return {
        id: shop.id,
        name: shop.name,
        status: shop.status,
        verified: shop.status === 'verified',
        logo_url: null,
        description: shop.description,
        address: shop.address_line1,
        city: null,
        phone: shop.phone_e164,
        latitude: shop.latitude,
        longitude: shop.longitude,
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}
