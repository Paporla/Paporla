'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Navigation, Clock, MapPin, AlertCircle, Package, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
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
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
            <div className="w-28 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </Card>
      </motion.div>
    )
  }

  const config = getStatusConfig(reservation.status)
  const windowLabel = formatPickupWindow(reservation.pickup_start_at, reservation.pickup_end_at, reservation.timezone)
  const endHHmm = marketEndTimeHHmm(reservation.pickup_end_at, reservation.timezone)
  const totalLabel = formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')

  const googleMapsUrl = reservation.shop_address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop_address)}`
    : null

  // El código de recogida NO existe hasta la fase 4 (lo emite el comercio al
  // confirmar). En lugar de un código inventado, la carta dice la verdad.
  const codeNote =
    reservation.status === 'payment_pending'
      ? 'El comercio recibirá tu reserva y la confirmará. Tu código de recogida aparecerá aquí cuando quede lista.'
      : 'Tu código de recogida aparecerá aquí cuando la reserva quede lista.'

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
      <Card glass className="border-primary/30 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5">
          {/* Icono de pack (la fila canónica no trae imagen). */}
          <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Package className="w-9 h-9 text-primary" />
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Próxima recogida</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <Link href={`/packs/${reservation.pack_id}`}>
              <h3 className="text-lg font-bold dark:text-white text-gray-900 hover:text-primary transition-colors line-clamp-1">
                {reservation.pack_title}
              </h3>
            </Link>
            <Link href={`/shops/${reservation.shop_id}`}>
              <p className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary transition-colors">
                {reservation.shop_name}
              </p>
            </Link>

            {reservation.shop_address && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {reservation.shop_address}
              </p>
            )}

            {windowLabel && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{windowLabel}</span>
                </div>
                {endHHmm && <CountdownTimer targetDate={reservation.pickup_end_at} targetEndTime={endHHmm} />}
              </div>
            )}

            <div className="mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
            </div>
          </div>

          {/* Nota honesta de código + acciones */}
          <div className="flex flex-col items-stretch gap-2 w-full md:w-auto md:min-w-[190px]">
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] dark:text-gray-400 text-gray-600 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Código de recogida
              </p>
              <p className="text-[11px] dark:text-gray-300 text-gray-600 mt-1 leading-snug">{codeNote}</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-primary">{totalLabel}</p>
            </div>

            <div className="flex gap-2">
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Cómo llegar
                </a>
              )}
              <Link href={`/packs/${reservation.pack_id}`} className="flex-1 md:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  Ver detalles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
