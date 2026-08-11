'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Store, ShieldAlert, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import OnboardingBanner from '@/components/onboarding/OnboardingBanner'
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
  const searchParams = useSearchParams()
  const isNewShop = searchParams.get('new') === 'true'

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

  // Mostrar aviso si el comercio no esta verificado
  if (!shop.verified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Comercio en revision</h2>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-6">
            Tu comercio <strong className="text-primary">{shop.name}</strong> esta pendiente de verificacion por nuestro
            equipo. Te notificaremos cuando este aprobado.
          </p>
          <p className="text-xs dark:text-gray-600 text-gray-500 mb-6">
            Mientras tanto, asegurate de completar todos los datos de tu perfil para acelerar el proceso.
          </p>
          <Link href="/business/profile" className="block w-full">
            <Button className="w-full" variant="outline">
              Completar perfil
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Banner de bienvenida para comercio nuevo recien verificado
  {
    isNewShop && (
      <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm dark:text-gray-300 text-gray-700">
          Perfil completado! Ya puedes empezar a publicar packs.
        </p>
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
      <OnboardingBanner type="commerce" />
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
