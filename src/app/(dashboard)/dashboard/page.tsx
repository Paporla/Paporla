'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { useAuth } from '@/hooks/useAuth'
import { useReservations } from '@/hooks/useReservations'
import UserWelcomeBanner from '@/components/dashboard/UserWelcomeBanner'
import OnboardingBanner from '@/components/onboarding/OnboardingBanner'
import MarketSelectionBanner from '@/components/dashboard/MarketSelectionBanner'
import UserStatsGrid from '@/components/dashboard/UserStatsGrid'
import UserQuickActions from '@/components/dashboard/UserQuickActions'
import NextPickupCard from '@/components/dashboard/NextPickupCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import Toast from '@/components/ui/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import { isActiveStatus, sortReservationsByPickupTime } from '@/lib/constants/reservations'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { reservations, loading, error: hookError } = useReservations()
  // El toast se deriva del parámetro de la URL en el primer render (llegada
  // tras una reserva exitosa): así no hay setState dentro del efecto.
  const [showReservedToast, setShowReservedToast] = useState(() => searchParams.get('reserved') === 'true')

  // Limpiar el parámetro de la URL sin recargar (el estado ya se derivó arriba).
  useEffect(() => {
    if (searchParams.get('reserved') === 'true') {
      const url = new URL(window.location.href)
      url.searchParams.delete('reserved')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const { activeReservations, stats, activities } = useMemo(() => {
    // La API ya devuelve las filas en orden más reciente primero
    // (created_at DESC en list_my_reservations), con todos los campos
    // canónicos: no hay nada que filtrar por "completitud".
    const active = sortReservationsByPickupTime(reservations.filter((r) => isActiveStatus(r.status)))
    const completed = reservations.filter((r) => r.status === 'picked_up' || r.status === 'completed')

    const totalPacksRescued = completed.length
    const co2Saved = Math.round(totalPacksRescued * 1.2)
    // moneySaved en unidades mayores. CLP no tiene decimales; cuando LATAM
    // use monedas con centavos, se dividen entre 100.
    const moneySaved = completed.reduce(
      (sum, r) => sum + r.total_amount_minor / 10 ** (r.currency_code === 'CLP' ? 0 : 2),
      0,
    )
    const points = totalPacksRescued * 10

    let level = 'Aprendiz'
    if (points >= 500) level = 'Rescatador Elite'
    else if (points >= 200) level = 'Rescatador Pro'
    else if (points >= 50) level = 'Rescatador Avanzado'
    else if (points >= 10) level = 'Rescatador'

    // 0028: "Hace X" se cuenta desde el último cambio de la reserva
    // (updated_at): en una activa es igual a created_at; en una cancelada,
    // el momento exacto de la cancelación.
    const recentActivities = reservations.slice(0, 5).map((r) => ({
      id: r.reservation_id,
      type: 'reservation' as const,
      title: r.pack_title,
      description: r.shop_name,
      status: r.status,
      created_at: r.updated_at || r.created_at,
      link: '/reservations',
    }))

    return {
      activeReservations: active,
      stats: {
        activeReservations: active.length,
        totalPacksRescued,
        co2Saved,
        moneySaved,
        points,
        level,
      },
      activities: recentActivities,
    }
  }, [reservations])

  if (loading) return <DashboardSkeleton />

  const nextReservation = activeReservations[0]

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8 relative">
      {/* Decorative blobs — mismo estilo que landing/auth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Toast de reserva exitosa (mensaje honesto: el código llega en la fase 4) */}
      {showReservedToast && (
        <Toast
          message="¡Reserva creada! El comercio la confirma pronto. Podrás seguirla en Mis reservas."
          type="success"
          onClose={() => setShowReservedToast(false)}
          duration={6000}
        />
      )}

      <OnboardingBanner level={stats.level} />

      {/* Bloqueo funcional (F2b): sin mercado, create_payment_reservation
          (0009:285) rechaza la reserva con MARKET_MISMATCH. El banner se
          explica y enlaza al selector de /profile; no es cerrable porque
          no es un aviso opcional. Desaparece solo con mercado elegido. */}
      {user && !user.marketId && <MarketSelectionBanner />}

      <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar banner</div>}>
        <UserWelcomeBanner
          userName={user?.displayName ?? 'Usuario'}
          packsRescued={stats.totalPacksRescued}
          level={stats.level}
          points={stats.points}
        />
      </ErrorBoundary>

      <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar estadisticas</div>}>
        <UserStatsGrid stats={stats} />
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar acciones</div>}>
          <UserQuickActions />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar proxima recogida</div>}>
          {nextReservation ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h2 className="text-lg font-semibold dark:text-white text-gray-900">Proxima recogida</h2>
              </div>
              <NextPickupCard reservation={nextReservation} />
            </div>
          ) : (
            <div className="glass-card border-dashed border-primary/30 rounded-2xl p-8 text-center">
              <p className="dark:text-gray-400 text-gray-600">No tienes reservas activas</p>
              <Link href="/packs" className="text-primary text-sm hover:underline inline-block mt-2">
                Explora packs disponibles
              </Link>
            </div>
          )}
        </ErrorBoundary>
      </div>

      <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar actividad reciente</div>}>
        <RecentActivity activities={activities} />
      </ErrorBoundary>

      {hookError && <Toast message={hookError} type="error" onClose={() => {}} />}
    </motion.div>
  )
}
