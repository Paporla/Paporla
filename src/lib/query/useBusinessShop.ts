'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useBusinessShop() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['business-shop', user?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, verified, logo_url, description, address, city, phone, latitude, longitude')
        .eq('owner_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}
