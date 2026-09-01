'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Clock, MapPin, Navigation, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useCreateReservation, type PackReservationInfo } from '@/hooks/useCreateReservation'
import { useAuth } from '@/hooks/useAuth'
import { isMarketMismatchMessage } from '@/lib/utils/db-errors'
import { trackBeginCheckout } from '@/lib/analytics/events'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatPickupWindow } from '@/lib/utils/reserve'
import type { SerializedPack } from '../PackDetailClient'

interface ReserveModalProps {
  isOpen: boolean
  onClose: () => void
  pack: SerializedPack
}

type Phase = 'confirm' | 'success'

/**
 * Ventana de confirmación de la reserva (detalle de pack).
 *
 * Promesas honestas del modo piloto (sin pagos todavía):
 *  - Cantidad siempre 1: la RPC `create_payment_reservation` (0009:209)
 *    no tiene parámetro de cantidad.
 *  - No hay selector de método de pago: no existe todavía.
 *  - No muestra código de recogida: la RPC no lo devuelve; el código se
 *    emite más adelante en el flujo y aparecerá en "Mis reservas".
 *  - El botón confirmación deshabilitado SIEMPRE explica por qué.
 *
 * Caso MARKET_MISMATCH (0009:285): la base rechaza la reserva porque el
 * mercado del perfil no coincide con el del pack. El error genérico
 * ("revisa tu ubicación") no era accionable: no hay detección de ubicación
 * de verdad, el catálogo del piloto siempre es Chile y el problema real es
 * que el perfil aún no tiene mercado elegido (o tiene otro). Aquí se
 * sustituye el aviso por la explicación exacta según el perfil del usuario
 * y un botón que lleva a elegir/cambiar el mercado en Mi perfil; "Reintentar"
 * no aparece porque reintentar sin cambiar el mercado da siempre igual.
 *
 * Pantalla de éxito: "Seguir explorando" navega al catálogo (/packs) y no
 * solo cierra el modal. Cerrar y quedarse en el detalle del pack deja una
 * página vieja (el pack ya no tiene stock) y daba la sensación de que el
 * botón "no hacía nada".
 *
 * Layout (mobile-first, como Too-Good-To-Go):
 *  - Móvil: bottom sheet anclado abajo (items-end). El panel no crece más
 *    que la pantalla (max-h dvh); el contenido se scrolle hacia adentro y
 *    el footer SIEMPRE queda visible.
 *  - Escritorio: centrado con flexbox (NO con top-1/2 + translate: framer-motion
 *    escribe su propio transform inline y pisa los translate de Tailwind —
 *    ese era el bug del modal "muy abajo" con el pie bajo la barra de tareas).
 */
export default function ReserveModal({ isOpen, onClose, pack }: ReserveModalProps) {
  const { createReservation, lastReservation, loading, error, clearError } = useCreateReservation()
  const { user } = useAuth()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [acceptPolicies, setAcceptPolicies] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  // Al abrir: estado limpio y evento begin_checkout del funnel GA4 (una vez
  // por apertura, no por render).
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setPhase('confirm')
      setAcceptPolicies(false)
      trackBeginCheckout(pack.id, pack.title, pack.price_minor, pack.currency_code, pack.shop.name)
    }
    wasOpen.current = isOpen
  }, [isOpen, pack])

  // Bloquear scroll del fondo mientras está abierta.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => dialogRef.current?.focus())
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Cierre con Escape + focus trap (misma lógica que Modal.tsx).
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleClose = useCallback(() => {
    clearError()
    onClose()
  }, [clearError, onClose])

  /** Clic en el fondo (el layer de pantalla completa), no en el panel. */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose()
  }

  /** Datos canónicos que la UI ya pinta; la RPC no necesita más. */
  const packInfo: PackReservationInfo = {
    title: pack.title,
    imageUrl: pack.image_url,
    price_minor: pack.price_minor,
    currency_code: pack.currency_code,
    shopName: pack.shop.name,
    shopAddress: pack.shop.address,
    pickupStartAt: pack.pickup_start_at,
    pickupEndAt: pack.pickup_end_at,
    timezone: pack.timezone,
  }

  const handleConfirm = async () => {
    if (!acceptPolicies || loading) return
    const details = await createReservation(pack.id, packInfo)
    if (details) setPhase('success')
    // Si falló, el error traducido ya quedó en `error` y se pinta en pantalla.
  }

  const windowLabel = formatPickupWindow(pack.pickup_start_at, pack.pickup_end_at, pack.timezone)
  const totalLabel = formatMinorPrice(pack.price_minor, pack.currency_code, 'es-CL')

  // ¿El fallo fue de mercado? En ese caso el modal deja de ser un "intenta
  // otra vez" y pasa a ser una invitación a elegir/cambiar de mercado.
  const marketBlocked = isMarketMismatchMessage(error)
  const hasMarket = user?.marketId != null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reserve-modal-title"
          tabIndex={-1}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4 dark:bg-black/70 bg-black/30 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 64 }}
            animate={{ y: 0 }}
            exit={{ y: 64 }}
            className="w-full sm:max-w-md dark:bg-gray-900 bg-white rounded-t-2xl sm:rounded-xl border dark:border-gray-700 border-gray-200 shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)]"
          >
            {/* Asita del bottom sheet (solo móvil). */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-10 rounded-full dark:bg-gray-700 bg-gray-300" />
            </div>

            <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200 shrink-0">
              <h2 id="reserve-modal-title" className="text-xl font-bold dark:text-white text-gray-900">
                {phase === 'success' ? 'Reserva creada' : 'Confirmar reserva'}
              </h2>
            </div>

            {/* El contenido se scrolle hacia adentro: el footer nunca se tapa. */}
            <div className="p-6 overflow-y-auto">
              {phase === 'confirm' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold dark:text-white text-gray-900 truncate">{pack.title}</p>
                      <p className="text-xs dark:text-gray-400 text-gray-600">{pack.shop.name}</p>
                    </div>
                  </div>

                  <div className="rounded-lg dark:bg-white/5 bg-gray-50 p-3 space-y-2 text-sm dark:text-gray-300 text-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span>Recogida: {windowLabel ?? 'por definir'}</span>
                    </div>
                    {pack.shop.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{pack.shop.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="dark:text-gray-400 text-gray-600">
                      {pack.remaining_stock === 1 ? 'Queda' : 'Quedan'} {pack.remaining_stock} en stock
                    </span>
                    <span className="text-lg font-bold text-primary">{totalLabel}</span>
                  </div>

                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs space-y-1 dark:text-gray-300 text-gray-700">
                    <p>El pack queda apartado mientras el comercio confirma. La reserva no genera ningún cobro.</p>
                    <p>
                      El código de recogida aparecerá en{' '}
                      <Link href="/reservations" className="text-primary underline">
                        Mis reservas
                      </Link>{' '}
                      cuando la reserva quede confirmada.
                    </p>
                  </div>

                  {error && !marketBlocked && (
                    <div
                      role="alert"
                      className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm dark:text-red-300 text-red-700"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {marketBlocked && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm dark:text-red-300 text-red-700"
                    >
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            {hasMarket ? 'Este pack es de otro mercado' : 'Aún no has elegido tu mercado'}
                          </p>
                          <p className="mt-0.5">
                            {hasMarket
                              ? 'Solo puedes reservar desde el mercado que elegiste en tu perfil. Cámbialo para reservar este pack.'
                              : 'Para reservar, elige el país donde buscas packs. Se hace en un minuto, desde Mi perfil.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exclusion del derecho a retracto (art. 3 bis Ley 19.496):
                      obligatorio informarla de forma destacada ANTES del pago.
                      Sin este aviso, el retracto se extiende hasta 90 dias. */}
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                      Por tratarse de alimentos perecederos, esta reserva no admite derecho a retracto (art. 3 bis, Ley
                      19.496). Puedes cancelarla gratis desde Mis Reservas antes de la hora de retiro.
                    </p>
                  </div>

                  <label className="flex items-start gap-2 text-xs dark:text-gray-300 text-gray-700">
                    <input
                      type="checkbox"
                      checked={acceptPolicies}
                      onChange={(e) => setAcceptPolicies(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      Acepto las{' '}
                      <Link href="/legal/politicas-retiro" target="_blank" className="text-primary underline">
                        políticas de retiro y cancelación
                      </Link>{' '}
                      y entiendo que no aplica derecho a retracto.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white text-gray-900">¡Pack reservado!</h3>
                    <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                      {pack.shop.name} recibió tu reserva. Cuando la confirmen, tu código de recogida aparecerá en Mis
                      reservas.
                    </p>
                  </div>

                  <div className="rounded-lg dark:bg-white/5 bg-gray-50 p-3 text-sm text-left space-y-2 dark:text-gray-300 text-gray-700">
                    {lastReservation && (
                      <div className="flex items-center justify-between">
                        <span className="dark:text-gray-400 text-gray-600">Reserva</span>
                        <span className="font-mono text-xs">#{lastReservation.id.slice(0, 8)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span>Recogida: {windowLabel ?? 'por definir'}</span>
                    </div>
                    {pack.shop.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{pack.shop.address}</span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            pack.shop.address,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors shrink-0"
                        >
                          <Navigation className="w-3 h-3" />
                          <span className="text-xs">Cómo llegar</span>
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="dark:text-gray-400 text-gray-600">Total</span>
                      <span className="font-bold text-primary">
                        {formatMinorPrice(
                          lastReservation?.amountMinor ?? pack.price_minor,
                          lastReservation?.currencyCode ?? pack.currency_code,
                          'es-CL',
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs dark:text-gray-500 text-gray-400">
                    El pack queda apartado mientras el comercio confirma. Puedes ver y gestionar tu reserva en Mis
                    reservas.
                  </p>
                </div>
              )}
            </div>

            {/* Footer fijo: siempre visible, con margen para el "indicador de inicio" de iPhone. */}
            <div className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t dark:border-gray-700 border-gray-200 shrink-0">
              {phase === 'confirm' ? (
                <div className="space-y-2">
                  {marketBlocked ? (
                    <div className="flex gap-3">
                      <Button onClick={handleClose} variant="outline" className="flex-1">
                        Cerrar
                      </Button>
                      <Button onClick={() => router.push('/profile')} className="flex-1">
                        {hasMarket ? 'Cambiar mi mercado' : 'Elegir mi mercado'}
                      </Button>
                    </div>
                  ) : error ? (
                    <div className="flex gap-3">
                      <Button onClick={handleClose} variant="outline" className="flex-1">
                        Cerrar
                      </Button>
                      <Button onClick={handleConfirm} loading={loading} className="flex-1">
                        Reintentar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button onClick={handleClose} variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirm} disabled={!acceptPolicies} loading={loading} className="flex-1">
                        Reservar
                      </Button>
                    </div>
                  )}
                  {!acceptPolicies && !error && (
                    <p className="text-center text-xs dark:text-gray-500 text-gray-400">
                      Debes aceptar las políticas para reservar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  {/* Navega al catálogo: volver a la página del pack dejaría
                      una vista vieja (el stock ya se fue) y el botón parecería
                      que no hace nada. */}
                  <Button onClick={() => router.push('/packs')} className="flex-1">
                    Seguir explorando
                  </Button>
                  <Link href="/reservations" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Ver mis reservas
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
