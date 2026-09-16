'use client'

import { useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { useAuth } from '@/hooks/useAuth'
import { useReservations } from '@/hooks/useReservations'
import { useNowTick } from '@/hooks/useNowTick'
import { effectiveReservationStatusForCustomer } from '@/lib/utils/reservationDisplay'
import UserWelcomeBanner from '@/components/dashboard/UserWelcomeBanner'
import OnboardingBanner from '@/components/onboarding/OnboardingBanner'
import MarketSelectionBanner from '@/components/dashboard/MarketSelectionBanner'
import UserStatsGrid from '@/components/dashboard/UserStatsGrid'
import UserQuickActions from '@/components/dashboard/UserQuickActions'
import NextPickupCard from '@/components/dashboard/NextPickupCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import { co2eKgForPacks, computeMoneySaved } from '@/lib/constants/impact'
import ErrorBoundary from '@/components/ErrorBoundary'
import { isActiveStatus, sortReservationsByPickupTime } from '@/lib/constants/reservations'

export default function UserDashboardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { reservations, loading, error: hookError, invalidate } = useReservations()
  /*
   * Lote UX punto 4: el aviso de "reserva creada" ya no es un <Toast> local con
   * estado propio; lo sirve el provider global en cuanto se llega con
   * ?reserved=true, y el parámetro se limpia de la URL sin recargar. El ref
   * garantiza que salga UNA sola vez aunque el efecto se repita (en desarrollo
   * React monta los efectos dos veces con StrictMode).
   */
  const { addToast } = useToast()
  const reservedToastFired = useRef(false)

  useEffect(() => {
    if (searchParams.get('reserved') !== 'true') return

    if (!reservedToastFired.current) {
      reservedToastFired.current = true
      // 6 s en vez de los 4 s por defecto: el mensaje es largo y da tiempo a
      // leerlo entero. Es la misma duración que tenía el cartel local.
      addToast('¡Reserva creada! El comercio la confirma pronto. Podrás seguirla en Mis reservas.', 'success', 6000)
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('reserved')
    window.history.replaceState({}, '', url.toString())
  }, [searchParams, addToast])

  // L-02: la actividad reciente también mira el reloj.
  const now = useNowTick(30_000)
  const { activeReservations, stats, activities } = useMemo(() => {
    // La API ya devuelve las filas en orden más reciente primero
    // (created_at DESC en list_my_reservations), con todos los campos
    // canónicos: no hay nada que filtrar por "completitud".
    const active = sortReservationsByPickupTime(reservations.filter((r) => isActiveStatus(r.status)))
    const completed = reservations.filter((r) => r.status === 'picked_up' || r.status === 'completed')

    const totalPacksRescued = completed.length
    // A-23: una sola cifra de CO₂ en toda la app (antes 1,2 aquí y 2,5 en la
    // portada). La constante vive en @/lib/constants/impact.
    const co2Saved = co2eKgForPacks(totalPacksRescued)
    // A-05: "Ahorrado" era la suma de `total_amount_minor`, es decir el PRECIO
    // DEL PACK. Era gasto, no ahorro. El ahorro real es (precio original − lo
    // pagado) × unidades, la misma fórmula que usa `community_stats` (0035)
    // para la landing: así las dos pantallas no pueden contradecirse.
    //
    // Degradación: si la migración 0050 no está aplicada, la RPC no trae el
    // precio original y `savingsAvailable` sale false. Entonces la tarjeta
    // muestra "Valor de tus packs" con el importe pagado —una cifra que sí
    // tenemos y una etiqueta que sí es cierta— en vez de un $0 falso.
    const { available: savingsAvailable, savingsMinor, paidMinor } = computeMoneySaved(completed)
    // CLP no tiene decimales; cuando LATAM use monedas con centavos, se dividen
    // entre 100. La moneda se toma de la última reserva rescatada, igual que
    // hace `community_stats` (0035) en la landing: todas las de un usuario son
    // del mismo mercado, y así las dos pantallas no pueden discrepar.
    const divisor = 10 ** (completed.at(-1)?.currency_code === 'CLP' ? 0 : 2)
    const moneySaved = (savingsAvailable ? savingsMinor : paidMinor) / divisor
    // A-73: los puntos y los niveles ("Rescatador Elite", etc.) se han quitado.
    // Eran una escala inventada (packs × 10) que no se guardaba en ninguna
    // parte, no tenía reglas ni recompensa, y se presentaba al usuario como si
    // fuera un logro real. Si algún día se construye fidelización de verdad,
    // vuelve por la puerta grande: con tabla, reglas y beneficios.

    // 0028: "Hace X" se cuenta desde el último cambio de la reserva
    // (updated_at): en una activa es igual a created_at; en una cancelada,
    // el momento exacto de la cancelación.
    const recentActivities = reservations.slice(0, 5).map((r) => ({
      id: r.reservation_id,
      type: 'reservation' as const,
      title: r.pack_title,
      description: r.shop_name,
      status: effectiveReservationStatusForCustomer(r.status, r.pickup_start_at, r.pickup_end_at, now),
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
        savingsAvailable,
      },
      activities: recentActivities,
    }
  }, [reservations, now])

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

      {/*
        L-33: el fallo de carga ya NO es un cartel flotante que se autodestruye
        a los 4 s (dejaba el panel vacío sin ninguna explicación). Se queda
        escrito arriba, dice qué puede estar incompleto y ofrece reintentar.
      */}
      {hookError && (
        <div
          role="alert"
          className="glass-card dark:border-red-500/30 border-red-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="dark:text-white text-gray-900 font-medium text-sm">No pudimos cargar tus reservas</p>
            <p className="dark:text-gray-400 text-gray-600 text-xs mt-1">
              Lo que ves debajo puede estar incompleto. Detalle: {hookError}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => invalidate()}>
            Reintentar
          </Button>
        </div>
      )}

      <OnboardingBanner />

      {/* Bloqueo funcional (F2b): sin mercado, create_payment_reservation
          (0009:285) rechaza la reserva con MARKET_MISMATCH. El banner se
          explica y enlaza al selector de /profile; no es cerrable porque
          no es un aviso opcional. Desaparece solo con mercado elegido. */}
      {user && !user.marketId && <MarketSelectionBanner />}

      <ErrorBoundary fallback={<div className="p-4 text-sm text-gray-500">Error al cargar banner</div>}>
        <UserWelcomeBanner
          userName={user?.displayName ?? 'Usuario'}
          packsRescued={stats.totalPacksRescued}
          co2SavedKg={stats.co2Saved}
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
    </motion.div>
  )
}
