'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import UserWelcomeBanner from '@/components/dashboard/UserWelcomeBanner'
import UserStatsGrid from '@/components/dashboard/UserStatsGrid'
import UserQuickActions from '@/components/dashboard/UserQuickActions'
import NextPickupCard from '@/components/dashboard/NextPickupCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import Toast from '@/components/ui/Toast'
import { sortReservationsByPickupTime } from '@/components/dashboard/ReservationCard'
import type { Reservation } from '@/types/reservation'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState({
    activeReservations: 0,
    totalPacksRescued: 0,
    co2Saved: 0,
    moneySaved: 0,
    points: 0,
    level: 'Aprendiz',
  })
  const [activities, setActivities] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    setLoading(true)

    const { data: reservationsData, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        *,
        pack:packs (id, title, description, price_cents, image_url),
        shop:shops (id, name, address, city, phone, logo_url, rating)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (!reservationsData || reservationsData.length === 0) {
      setStats({ activeReservations: 0, totalPacksRescued: 0, co2Saved: 0, moneySaved: 0, points: 0, level: 'Aprendiz' })
      setLoading(false)
      return
    }

    const validReservations = reservationsData.filter((r: any) => r.pack && r.shop)
    const active = validReservations.filter((r: any) => ['confirmed', 'pending'].includes(r.status))
    const completed = validReservations.filter((r: any) => r.status === 'picked_up')

    const totalPacksRescued = completed.length
    const co2Saved = Math.round(totalPacksRescued * 1.2)
    const moneySavedCents = completed.reduce((sum: number, r: any) => sum + (r.total_price_cents || 0), 0)
    const points = totalPacksRescued * 10

    let level = 'Aprendiz'
    if (points >= 500) level = 'Rescatador Elite'
    else if (points >= 200) level = 'Rescatador Pro'
    else if (points >= 50) level = 'Rescatador Avanzado'
    else if (points >= 10) level = 'Rescatador'

    setStats({ activeReservations: active.length, totalPacksRescued, co2Saved, moneySaved: moneySavedCents / 100, points, level })
    setActiveReservations(sortReservationsByPickupTime(active))

    const recentActivities = validReservations.slice(0, 5).map((r: any) => ({
      id: r.id,
      type: 'reservation' as const,
      title: r.pack.title,
      description: `${r.shop.name} - ${r.quantity || 1}x`,
      status: r.status,
      created_at: r.created_at,
      link: '/reservations',
    }))
    setActivities(recentActivities)
    setLoading(false)
  }

  if (loading) return <DashboardSkeleton />

  const nextReservation = activeReservations[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-8"
    >
      <UserWelcomeBanner
        userName={user?.name || 'Usuario'}
        packsRescued={stats.totalPacksRescued}
        level={stats.level}
        points={stats.points}
      />

      <UserStatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <UserQuickActions />

        {nextReservation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-lg font-semibold text-white">Proxima recogida</h2>
            </div>
            <NextPickupCard reservation={nextReservation} />
          </div>
        ) : (
          <div className="bg-dark-card border border-dashed border-primary/30 rounded-2xl p-8 text-center">
            <p className="text-gray-400">No tienes reservas activas</p>
            <Link href="/packs" className="text-primary text-sm hover:underline inline-block mt-2">
              Explora packs disponibles
            </Link>
          </div>
        )}
      </div>

      <RecentActivity activities={activities} />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  )
}
