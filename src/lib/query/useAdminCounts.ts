'use client'

import { useQuery } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'

export function useAdminCounts() {
  return useQuery({
    queryKey: ['admin-counts'],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const [users, shopsResult, packs, reservations] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact' }),
        supabase.from('packs').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }),
      ])
      const shops = (shopsResult.data || []) as { verified: boolean; banned: boolean }[]
      return {
        users: users.count ?? 0,
        shops: shopsResult.count ?? 0,
        packs: packs.count ?? 0,
        reservations: reservations.count ?? 0,
        verifiedShops: shops.filter((s) => s.verified).length,
        bannedShops: shops.filter((s) => s.banned).length,
        pendingShops: shops.filter((s) => !s.verified && !s.banned).length,
      }
    },
    staleTime: 60 * 1000,
  })
}
