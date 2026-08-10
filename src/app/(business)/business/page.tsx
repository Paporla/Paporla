'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessDashboard } from '@/components/business/dashboard/useBusinessDashboard'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import BusinessWelcomeBanner from '@/components/business/dashboard/BusinessWelcomeBanner'
import BusinessStatsGrid from '@/components/business/dashboard/BusinessStatsGrid'
import BusinessQuickActions from '@/components/business/dashboard/BusinessQuickActions'
import BusinessRecentActivity from '@/components/business/dashboard/BusinessRecentActivity'
import TodayPickups from '@/components/business/TodayPickups'

export default function BusinessDashboard() {
  const { loading: authLoading } = useAuth()
  const { shop, stats, recentReservations, loading, error: dashError } = useBusinessDashboard()

  // Evitar flash: mientras se resuelve la autenticación, mostrar skeleton
  if (authLoading || loading) return <LoadingSkeleton />

  if (dashError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <Store className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Error al cargar</h2>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-6">{dashError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Bienvenido a Paporla!</h2>
          <p className="dark:text-gray-400 text-gray-600 mb-6">
            Para comenzar a vender packs, primero debes registrar tu comercio.
          </p>
          <Link href="/business/profile" className="block w-full">
            <Button className="w-full">Completar mi perfil de comercio</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Convertir reservas recientes a formato de actividad
  const activities = (recentReservations ?? []).map((r) => ({
    id: r.id,
    type: 'reservation' as const,
    title: r.pack.title,
    description: `${r.user.name} reservó ${r.quantity}x - ${formatPrice(r.total_price_cents)}`,
    status: r.status,
    created_at: r.created_at,
    link: '/business/reservations',
  }))

  return (
    <div className="space-y-8 pb-8">
      <BusinessWelcomeBanner
        shopName={shop.name}
        todayReservations={stats.todayReservations}
        weekGrowth={stats.weekGrowth}
      />

      <BusinessStatsGrid
        stats={{
          activePacks: stats.activePacks,
          totalPacks: stats.totalPacks,
          todayReservations: stats.todayReservations,
          totalReservations: stats.totalReservations,
          totalRevenue: stats.totalRevenue,
          pendingReservations: stats.pendingReservations,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BusinessQuickActions />
        <TodayPickups shopId={shop.id} />
      </div>

      <BusinessRecentActivity activities={activities} />
    </div>
  )
}
