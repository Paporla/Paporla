'use client'

import { useQueries } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

export interface PackBrief {
  id: string
  title: string
  remaining_stock: number
  is_active: boolean
  price_cents: number
}
export interface ReservationBrief {
  id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: string
  created_at: string
  user: { name: string; email: string }
  pack: { title: string }
}
export interface DashboardStats {
  totalPacks: number
  activePacks: number
  todayReservations: number
  totalReservations: number
  pendingReservations: number
  totalRevenue: number
}
export interface ShopInfo {
  id: string
  name: string
  verified: boolean
  logo_url: string | null
}

export function useBusinessDashboard() {
  const { data: shop, isLoading: shopLoading } = useBusinessShop()

  const packsQuery = {
    queryKey: ['business-packs', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('packs')
        .select('id, title, remaining_stock, is_active, price_cents')
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: false })
      return (data || []) as PackBrief[]
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  }

  const reservationsQuery = {
    queryKey: ['business-reservations-dash', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data } = await supabase
        .from('reservations')
        .select(
          'id, user_id, quantity, total_price_cents, status, created_at, pack:packs(title), user:user_profiles(name, email)',
        )
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: false })
      return ((data || []) as unknown as ReservationBrief[]).map((r) => ({
        ...r,
        user: r.user || { name: 'Usuario', email: '' },
      }))
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  }

  const [packsResult, reservationsResult] = useQueries({ queries: [packsQuery, reservationsQuery] })
  const packs = packsResult.data ?? []
  const rawReservations = reservationsResult.data ?? []
  const loading = shopLoading || packsResult.isLoading || reservationsResult.isLoading

  const activePacks = packs.filter((p) => p.is_active && p.remaining_stock > 0).length
  const today = new Date().toISOString().split('T')[0]
  const todayReservations = rawReservations.filter((r) => r.created_at?.startsWith(today)).length
  const totalReservations = rawReservations.length
  const pendingReservations = rawReservations.filter((r) => ['pending', 'confirmed'].includes(r.status)).length
  const totalRevenue = rawReservations
    .filter((r) => r.status === 'picked_up')
    .reduce((sum, r) => sum + (r.total_price_cents || 0), 0)

  return {
    shop,
    packs,
    recentReservations: rawReservations.slice(0, 5),
    loading,
    stats: {
      totalPacks: packs.length,
      activePacks,
      todayReservations,
      totalReservations,
      pendingReservations,
      totalRevenue,
    },
  }
}
