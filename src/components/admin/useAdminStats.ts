'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

export interface AdminSummary {
  totalUsers: number; totalShops: number; totalPacks: number; totalReservations: number
}

export function useAdminStats() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<AdminSummary>({ totalUsers: 0, totalShops: 0, totalPacks: 0, totalReservations: 0 })
  const [userStats, setUserStats] = useState<Array<{ day: string; registrations: number }>>([])
  const [roleDistribution, setRoleDistribution] = useState<Array<{ name: string; value: number }>>([])
  const [topShops, setTopShops] = useState<Array<{ name: string; reservations: number }>>([])
  const [growth, setGrowth] = useState({ users: 0 })

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)

    const [{ count: usersCount }, { count: shopsCount }, { count: packsCount }, { count: reservationsCount }] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('shops').select('*', { count: 'exact', head: true }),
      supabase.from('packs').select('*', { count: 'exact', head: true }),
      supabase.from('reservations').select('*', { count: 'exact', head: true }),
    ])
    setSummary({ totalUsers: usersCount || 0, totalShops: shopsCount || 0, totalPacks: packsCount || 0, totalReservations: reservationsCount || 0 })

    const lastDays = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]
    }).reverse()
    const byDay = await Promise.all(lastDays.map(async (day) => {
      const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', day + 'T00:00:00').lt('created_at', day + 'T23:59:59')
      return { day: day.slice(5), registrations: count || 0 }
    }))
    setUserStats(byDay)

    const last7 = byDay.slice(-7).reduce((s, d) => s + d.registrations, 0)
    const prev7 = byDay.slice(-14, -7).reduce((s, d) => s + d.registrations, 0)
    setGrowth({ users: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0 })

    const roles = ['user', 'comercio', 'admin', 'super_admin']
    const labels: Record<string, string> = { user: 'Usuarios', comercio: 'Comercios', admin: 'Admins', super_admin: 'Super Admins' }
    const roleData = await Promise.all(roles.map(async (r) => {
      const { count } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', r)
      return { name: labels[r] || r, value: count || 0 }
    }))
    setRoleDistribution(roleData)

    const { data: reservations } = await supabase.from('reservations').select('shop_id')
    const { data: shops } = await supabase.from('shops').select('id, name')
    const nameMap = new Map(shops?.map(s => [s.id, s.name]) || [])
    const counts = new Map<string, number>()
    reservations?.forEach(r => counts.set(r.shop_id, (counts.get(r.shop_id) || 0) + 1))
    setTopShops(Array.from(counts.entries()).map(([id, c]) => ({ name: nameMap.get(id) || 'Desconocido', reservations: c }))
      .sort((a, b) => b.reservations - a.reservations).slice(0, 5))

    setLoading(false)
  }

  return { loading, summary, userStats, roleDistribution, topShops, growth }
}
