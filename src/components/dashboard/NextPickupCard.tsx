'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Navigation, Clock, MapPin, AlertCircle, Package, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import { supabaseBrowser } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import CountdownTimer from '@/components/ui/CountdownTimer'
import { getStatusConfig } from '@/lib/constants/reservations'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatPickupWindow } from '@/lib/utils/reserve'
import type { MyReservation } from '@/types/reservation'

interface NextPickupCardProps {
  reservation: MyReservation
  loading?: boolean
  error?: string
}

/**
 * HH:mm del fin de la ventana EN LA ZONA HORARIA DEL MERCADO (no la del
 * navegador). CountdownTimer combina esa hora con la fecha en hora local,
 * así que en el piloto (Chile: navegador y mercado en America/Santiago) el
 * instante coincide exactamente.
 */
function marketEndTimeHHmm(iso: string, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone,
    }).formatToParts(new Date(iso))
    const hour = parts.find((p) => p.type === 'hour')?.value
    const minute = parts.find((p) => p.type === 'minute')?.value
    if (!hour || !minute) return null
    return `${hour}:${minute}`
  } catch {
    // Zona horaria inválida: mejor sin cuenta atrás que una hora mentirosa.
    return null
  }
}

/**
 * Tarjeta "Próxima recogida" del dashboard.
 *
 * Layout SIEMPRE de una columna (aunque haya ancho): vive en la columna
 * derecha del dashboard, que en escritorio ya es estrecha y en móvil ocupa
 * toda la pantalla. La versión anterior usaba `md:flex-row` de 3 columnas y
 * en esa medida apretada todo se partía: el comercio en 3 líneas, la cuenta
 * atrás en vertical ("6d / 3h / 54m") y el chip en 2 líneas.
 *
 * Reglas de esta versión:
 *  - `whitespace-nowrap` en la cuenta atrás y en el chip: nunca se parten.
 *  - `line-clamp-1` en pack/comercio y `truncate` en dirección: una línea
 *    y punto; el detalle se ve en "Ver detalles".
 *  - Acciones a ancho completo en fila: pulgares cómodos en móvil.
 *
 * El código de recogida NO existe hasta la fase 4 (lo emite el comercio al
 * confirmar). En lugar de un código inventado, la carta dice la verdad.
 */
export default function NextPickupCard({ reservation, loading, error }: NextPickupCardProps) {
  if (error) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card glass className="border-red-500/30 p-5 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </Card>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card glass className="border-primary/20 p-5 animate-pulse">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-36 bg-gray-100 dark:bg-gray-600 rounded" />
              </div>
              <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-600 rounded" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </Card>
      </motion.div>
    )
  }

  const config = getStatusConfig(reservation.status)
  const windowLabel = formatPickupWindow(reservation.pickup_start_at, reservation.pickup_end_at, reservation.timezone)
  const endHHmm = marketEndTimeHHmm(reservation.pickup_end_at, reservation.timezone)
  const totalLabel = formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')

  // "Cómo llegar": si el comercio tiene coordenadas (0028) se usan — Google
  // lleva al punto exacto. Sin ellas, respaldo al texto de la dirección
  // (que puede ser ambiguo: "Calle 59a" existe en muchas ciudades y puede
  // caer en otra).
  const hasCoords = reservation.shop_latitude != null && reservation.shop_longitude != null
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${reservation.shop_latitude},${reservation.shop_longitude}`
    : reservation.shop_address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop_address)}`
      : null

  // Foto del pack (0028): ruta de storage → URL pública, mismo patrón que el
  // catálogo (usePublicPacks). Sin foto, la tarjeta conserva el icono.
  const imageUrl = reservation.image_path
    ? supabaseBrowser().storage.from('pack-images').getPublicUrl(reservation.image_path).data.publicUrl
    : null

  // El código de recogida NO existe hasta la fase 4 (lo emite el comercio al
  // confirmar). En lugar de un código inventado, la nota dice la verdad.
  const codeNote =
    reservation.status === 'payment_pending'
      ? 'El comercio recibirá tu reserva y la confirmará. Tu código de recogida aparecerá aquí cuando quede lista.'
      : 'Tu código de recogida aparecerá aquí cuando la reserva quede lista.'

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
      <Card glass className="border-primary/30 overflow-hidden">
        <div className="p-5 flex flex-col gap-4">
          {/* Fila 1: icono + títulos + precio (el precio arriba a la derecha,
              donde el ojo va a buscar el total). */}
          <div className="flex items-start gap-3">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={reservation.pack_title}
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-cover border border-primary/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Próxima recogida</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <Link href={`/packs/${reservation.pack_id}`} className="block mt-0.5">
                <h3 className="text-base font-bold dark:text-white text-gray-900 hover:text-primary transition-colors line-clamp-1">
                  {reservation.pack_title}
                </h3>
              </Link>
              <Link href={`/shops/${reservation.shop_id}`} className="block">
                <p className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary transition-colors line-clamp-1">
                  {reservation.shop_name}
                </p>
              </Link>
            </div>
            <p className="text-lg font-bold text-primary shrink-0 leading-tight">{totalLabel}</p>
          </div>

          {/* Fila 2: dirección (1 línea, trunca). */}
          {reservation.shop_address && (
            <p className="text-xs text-gray-500 flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{reservation.shop_address}</span>
            </p>
          )}

          {/* Fila 3: ventana de recogida (puede partir en 2 líneas si es
              larga: es texto natural, no un dato que se rompa). */}
          {windowLabel && (
            <p className="text-xs text-gray-500 flex items-start gap-1.5 min-w-0">
              <Clock className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{windowLabel}</span>
            </p>
          )}

          {/* Fila 4: cuenta atrás (izquierda, nunca partida) + estado
              (derecha, nunca partido). */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            {endHHmm ? (
              <span className="whitespace-nowrap">
                <CountdownTimer targetDate={reservation.pickup_end_at} targetEndTime={endHHmm} />
              </span>
            ) : (
              <span />
            )}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
          </div>

          {/* Nota honesta del código de recogida. */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2">
            <p className="text-[11px] dark:text-gray-300 text-gray-600 flex items-start gap-1.5 leading-snug">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <span>{codeNote}</span>
            </p>
          </div>

          {/* Acciones a ancho completo: pulgares cómodos en móvil. */}
          <div className="flex gap-2">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Cómo llegar
              </a>
            )}
            <Link href={`/packs/${reservation.pack_id}`} className={googleMapsUrl ? 'flex-1' : 'w-full'}>
              <Button variant="outline" size="sm" className="w-full">
                Ver detalles
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
