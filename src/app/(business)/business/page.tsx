'use client'

import { useSearchParams } from 'next/navigation'
import { Store, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessDashboard } from '@/components/business/dashboard/useBusinessDashboard'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import Button from '@/components/ui/Button'
import { formatChilePesos } from '@/lib/utils/formatPrice'
import BusinessWelcomeBanner from '@/components/business/dashboard/BusinessWelcomeBanner'
import BusinessStatsGrid from '@/components/business/dashboard/BusinessStatsGrid'
import BusinessQuickActions from '@/components/business/dashboard/BusinessQuickActions'
import BusinessRecentActivity from '@/components/business/dashboard/BusinessRecentActivity'
import FirstStepsChecklist from '@/components/business/dashboard/FirstStepsChecklist'
import RepeatLastPackCard from '@/components/business/dashboard/RepeatLastPackCard'
import TodayPickups from '@/components/business/TodayPickups'
import PickupCodeValidator from '@/components/business/PickupCodeValidator'

export default function BusinessDashboard() {
  const { loading: authLoading } = useAuth()
  const { shop, packs, stats, recentReservations, loading, error: dashError } = useBusinessDashboard()
  const searchParams = useSearchParams()
  const isNewShop = searchParams.get('new') === 'true'
  // useQuery entrega undefined mientras no hay dato: para el checklist,
  // "sin dato" y "sin comercio" son el mismo caso (paso 1).
  const checklistShop = shop ?? null

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

  // Comercio sin perfil o pendiente de verificación: en lugar de dos
  // pantallas distintas, UN solo camino guiado. El checklist «Primeros
  // pasos» muestra dónde está el comercio y qué toca hacer ahora, con un
  // único botón para el paso actual (diseño: cero decisiones que tomar).
  if (!shop || !shop.verified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold dark:text-white text-gray-900">
              {shop ? `¡Hola, ${shop.name}!` : '¡Bienvenido a Paporla!'}
            </h1>
          </div>
          <FirstStepsChecklist shop={checklistShop} hasPacks={packs.length > 0} />
        </div>
      </div>
    )
  }

  // Convertir reservas recientes a formato de actividad. Los campos son los
  // de la fila canónica de list_shop_reservations (F4.1): nombre visible del
  // cliente (sin email ni teléfono), título snapshot del pack y importe en
  // la unidad menor (en el MVP quantity es siempre 1: no se muestra "1x").
  const activities = (recentReservations ?? []).map((r) => ({
    id: r.reservation_id,
    type: 'reservation' as const,
    title: r.pack_title,
    description: `${r.customer_display_name} · ${formatChilePesos(r.total_amount_minor)}`,
    status: r.status,
    created_at: r.created_at,
    link: '/business/reservations',
  }))

  return (
    <div className="space-y-8 pb-8">
      {/* Aviso de perfil recién completado (llega desde /callback?new=true). */}
      {isNewShop && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm dark:text-gray-300 text-gray-700">
            ¡Perfil completado! Ya puedes empezar a publicar packs.
          </p>
        </div>
      )}

      {/* Verificado pero sin packs: el último paso del camino guiado.
          Se oculta solo en cuanto exista el primer pack. */}
      <FirstStepsChecklist shop={checklistShop} hasPacks={packs.length > 0} />

      {/* Atajo del hábito diario: repetir el pack de ayer en dos toques.
          Solo aparece si hay packs anteriores y ninguno activo (Lote C). */}
      <RepeatLastPackCard packs={packs} />

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

      {/* Zona operativa del día, en dos mitades simétricas: validar la
          recogida (Lote B: sin navegar en la hora pico) y ver quién viene
          hoy. items-start evita que una tarjeta estire a la otra. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <PickupCodeValidator shopId={shop.id} />
        <TodayPickups shopId={shop.id} />
      </div>

      {/* A ancho completo, como pide su rejilla de 5 columnas (lg): en
          media columna quedaba apretado y descompensaba el panel. */}
      <BusinessQuickActions />

      <BusinessRecentActivity activities={activities} />
    </div>
  )
}
