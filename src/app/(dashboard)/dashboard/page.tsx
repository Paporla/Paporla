'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { useAuth } from '@/hooks/useAuth'
import { useReservations } from '@/hooks/useReservations'
import UserWelcomeBanner from '@/components/dashboard/UserWelcomeBanner'
import UserStatsGrid from '@/components/dashboard/UserStatsGrid'
import UserQuickActions from '@/components/dashboard/UserQuickActions'
import NextPickupCard from '@/components/dashboard/NextPickupCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import Toast from '@/components/ui/Toast'
import { sortReservationsByPickupTime } from '@/lib/constants/reservations'
import type { ReservationWithDetails } from '@/types/reservation'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const { reservations, loading, error: hookError } = useReservations()

  const { activeReservations, stats, activities } = useMemo(() => {
    const valid = reservations.filter((r): r is ReservationWithDetails => !!r.pack && !!r.shop)
    const active = sortReservationsByPickupTime(valid.filter((r) => ['confirmed', 'pending'].includes(r.status)))
    const completed = valid.filter((r) => r.status === 'picked_up')

    const totalPacksRescued = completed.length
    const co2Saved = Math.round(totalPacksRescued * 1.2)
    const moneySavedCents = completed.reduce((sum, r) => sum + (r.total_price_cents || 0), 0)
    const points = totalPacksRescued * 10

    let level = 'Aprendiz'
    if (points >= 500) level = 'Rescatador Elite'
    else if (points >= 200) level = 'Rescatador Pro'
    else if (points >= 50) level = 'Rescatador Avanzado'
    else if (points >= 10) level = 'Rescatador'

    const recentActivities = valid.slice(0, 5).map((r) => ({
      id: r.id,
      type: 'reservation' as const,
      title: r.pack.title,
      description: `${r.shop.name} - ${r.quantity || 1}x`,
      status: r.status,
      created_at: r.created_at,
      link: '/reservations',
    }))

    return {
      activeReservations: active,
      stats: {
        activeReservations: active.length,
        totalPacksRescued,
        co2Saved,
        moneySaved: moneySavedCents / 100,
        points,
        level,
      },
      activities: recentActivities,
    }
  }, [reservations])

  if (loading) return <DashboardSkeleton />

  const nextReservation = activeReservations[0]

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
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
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">Proxima recogida</h2>
            </div>
            <NextPickupCard reservation={nextReservation} />
          </div>
        ) : (
          <div className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 border-dashed border-primary/30 rounded-2xl p-8 text-center">
            <p className="dark:text-gray-400 text-gray-600">No tienes reservas activas</p>
            <Link href="/packs" className="text-primary text-sm hover:underline inline-block mt-2">
              Explora packs disponibles
            </Link>
          </div>
        )}
      </div>

      <RecentActivity activities={activities} />

      {hookError && <Toast message={hookError} type="error" onClose={() => {}} />}
    </motion.div>
  )
}
