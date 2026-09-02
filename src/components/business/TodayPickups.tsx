'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'
import PickupCard, { PickupItem } from './pickups/PickupCard'

/**
 * Zona horaria de referencia del piloto: solo existe el mercado Chile
 * (cada fila además trae su propia `timezone`, que es la que usamos).
 */
const MARKET_TIMEZONE = 'America/Santiago'

/**
 * "Recogidas de hoy" del piloto.
 *
 * Los datos vienen de la RPC canónica `list_shop_reservations` (0014:333),
 * NUNCA de la tabla (RLS respondería 42501): dos consultas en paralelo
 * (`ready_pickup` y `confirmed`; en el piloto la confirmación salta directo a
 * ready_pickup, y el flujo con pagos dejaría filas 'confirmed' hasta que abra
 * la ventana) y el filtro de "hoy" en el cliente, en la zona horaria de cada
 * fila (cuenta una ventana si CRUZA el día de hoy).
 *
 * Solo lectura: el código de recogida NO se muestra aquí — se emite una sola
 * vez al confirmar (0031) y en la base solo vive su huella sha256. La
 * validación de una recogida siempre es por código, en el
 * PickupCodeValidator de abajo.
 */
export default function TodayPickups({ shopId }: { shopId: string }) {
  const readyQuery = useQuery({
    queryKey: ['today-pickups-ready', shopId],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('list_shop_reservations', {
        p_shop_id: shopId,
        p_status: 'ready_pickup',
        p_limit: 100,
      })
      if (error) throw error
      return (data ?? []) as PickupItem[]
    },
    enabled: !!shopId,
    staleTime: 5 * 1000,
    refetchInterval: 15000,
  })

  const confirmedQuery = useQuery({
    queryKey: ['today-pickups-confirmed', shopId],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('list_shop_reservations', {
        p_shop_id: shopId,
        p_status: 'confirmed',
        p_limit: 100,
      })
      if (error) throw error
      return (data ?? []) as PickupItem[]
    },
    enabled: !!shopId,
    staleTime: 5 * 1000,
    refetchInterval: 15000,
  })

  const pickups = useMemo(() => {
    const all = [...(readyQuery.data ?? []), ...(confirmedQuery.data ?? [])]
    return all.filter(isTodayPickup).sort((a, b) => (a.pickup_start_at ?? '').localeCompare(b.pickup_start_at ?? ''))
  }, [readyQuery.data, confirmedQuery.data])

  const loading = readyQuery.isLoading || confirmedQuery.isLoading

  if (loading)
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 dark:bg-white/5 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b dark:border-white/10 border-gray-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recogidas de hoy
            {pickups.length > 0 && (
              <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded-full">{pickups.length}</span>
            )}
          </h2>
          {/* Sin "abajo/al lado": la posición del validador cambia entre el
              panel (al lado en escritorio, encima en móvil) y Reservas. */}
          <p className="text-xs dark:text-gray-500 text-gray-400">
            Se validan en «Validar código de recogida» con el código que te dé tu cliente.
          </p>
        </div>
      </div>
      <div className="p-5">
        {pickups.length === 0 ? (
          <div className="text-center py-8 px-4 dark:bg-white/5 bg-gray-50 rounded-xl border border-dashed dark:border-white/10 border-gray-200">
            <Clock className="w-10 h-10 dark:text-gray-600 text-gray-400 mx-auto mb-2" />
            <p className="dark:text-gray-400 text-gray-600 font-medium">No hay recogidas para hoy</p>
            <p className="text-xs dark:text-gray-600 text-gray-400 mt-1">
              Las reservas confirmadas con ventana de hoy aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pickups.map((pickup, index) => (
              <PickupCard key={pickup.reservation_id} pickup={pickup} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Una ventana "es de hoy" si su inicio o su fin caen hoy en la zona de la fila. */
function isTodayPickup(pickup: PickupItem): boolean {
  const tz = pickup.timezone || MARKET_TIMEZONE
  const today = dateKeyInTimezone(new Date().toISOString(), tz)
  if (!today) return false
  const start = dateKeyInTimezone(pickup.pickup_start_at, tz)
  const end = dateKeyInTimezone(pickup.pickup_end_at, tz)
  return start === today || end === today
}
