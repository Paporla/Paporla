'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

export interface AdminDashboardStats {
  totalUsers: number
  totalShops: number
  totalPacks: number
  totalReservations: number
  verifiedShops: number
  bannedShops: number
  pendingShops: number
}

export function useAdminDashboard() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0, totalShops: 0, totalPacks: 0, totalReservations: 0,
    verifiedShops: 0, bannedShops: 0, pendingShops: 0,
  })
  const [reservationsByDay, setReservationsByDay] = useState<Array<{ day: string; reservations: number }>>([])

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)

    const [{ count: usersCount }, { data: shops, count: shopsCount }, { count: packsCount }, { count: reservationsCount }] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('shops').select('*', { count: 'exact' }),
      supabase.from('packs').select('*', { count: 'exact', head: true }),
      supabase.from('reservations').select('*', { count: 'exact', head: true }),
    ])

    const verifiedShops = shops?.filter(s => s.verified).length || 0
    const bannedShops = shops?.filter(s => s.banned).length || 0
    const pendingShops = shops?.filter(s => !s.verified && !s.banned).length || 0

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]
    }).reverse()

    const byDay = await Promise.all(last7Days.map(async (day) => {
      const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true })
        .gte('created_at', `${day}T00:00:00`).lt('created_at', `${day}T23:59:59`)
      return { day: day.slice(5), reservations: count || 0 }
    }))

    setStats({ totalUsers: usersCount || 0, totalShops: shopsCount || 0, totalPacks: packsCount || 0,
      totalReservations: reservationsCount || 0, verifiedShops, bannedShops, pendingShops })
    setReservationsByDay(byDay)
    setLoading(false)
  }

  return { loading, stats, reservationsByDay }
}
