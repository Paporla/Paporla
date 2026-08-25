'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Package,
  XCircle,
} from 'lucide-react'
import { useReservations } from '@/hooks/useReservations'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import EmptyState from '@/components/ui/EmptyState'
import PageLoadingSpinner from '@/components/ui/PageLoadingSpinner'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import { canCancelReservation } from '@/lib/utils/canCancelReservation'
import { getStatusConfig, isActiveStatus, sortReservationsByPickupTime } from '@/lib/constants/reservations'
import { formatPickupWindow } from '@/lib/utils/reserve'
import type { MyReservation } from '@/types/reservation'

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  payment_pending: Clock,
  confirmed: CheckCircle,
  ready_pickup: Clock,
  picked_up: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: AlertCircle,
  expired: Ban,
}

/** Chip de estado seguro: si la base manda un valor nuevo, se ve crudo en gris. */
function StatusChip({ status }: { status: string }) {
  const config = getStatusConfig(status)
  const StatusIcon = statusIcons[status] ?? Clock
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${config.bg} ${config.color}`}
    >
      <StatusIcon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

interface CancelReservationModalProps {
  reservation: MyReservation
  isOpen: boolean
  onClose: () => void
  /** Se llama cuando la cancelación terminó bien; el page decide el toast. */
  onCancelled: () => void
}

/**
 * Modal de cancelación con motivo (bottom sheet como ReserveModal).
 *
 * cancel_reservation (0009:366) EXIGE motivo de al menos 3 letras; el modal
 * no deja confirmar sin él y, si el error llega igual (plazo agotado,
 * reserva ya no cancelable...), se muestra AQUÍ traducido, con reintentar,
 * en vez de un toast genérico que se va solo.
 */
function CancelReservationModal({ reservation, isOpen, onClose, onCancelled }: CancelReservationModalProps) {
  const { cancelReservation, cancelling } = useReservations()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  // Al abrir: estado limpio + bloquear scroll del fondo (mismo patrón que ReserveModal).
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError('')
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => dialogRef.current?.focus())
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Cierre con Escape + focus trap (mismo patrón que ReserveModal).
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!cancelling) onClose()
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
  }, [isOpen, onClose, cancelling])

  const reasonOk = reason.trim().length >= 3

  const handleConfirm = async () => {
    if (!reasonOk || cancelling) return
    setError('')
    try {
      await cancelReservation({ reservationId: reservation.reservation_id, reason: reason.trim() })
      onCancelled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.')
    }
  }

  // Clic en el fondo (el layer completo), no en el panel.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !cancelling) onClose()
  }

  const windowLabel = formatPickupWindow(reservation.pickup_start_at, reservation.pickup_end_at, reservation.timezone)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
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
              <h2 id="cancel-modal-title" className="text-xl font-bold dark:text-white text-gray-900">
                Cancelar reserva
              </h2>
            </div>

            {/* El contenido se scrolle hacia adentro: el footer nunca se tapa. */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold dark:text-white text-gray-900 truncate">{reservation.pack_title}</p>
                  <p className="text-xs dark:text-gray-400 text-gray-600">{reservation.shop_name}</p>
                </div>
              </div>

              <div className="rounded-lg dark:bg-white/5 bg-gray-50 p-3 space-y-2 text-sm dark:text-gray-300 text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>Recogida: {windowLabel ?? 'por definir'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="dark:text-gray-400 text-gray-600">Total</span>
                  <span className="font-bold text-primary">
                    {formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="cancel-reason" className="text-sm font-medium dark:text-white text-gray-900">
                  ¿Por qué la cancelas?
                </label>
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                  Obligatorio. Lo verá el comercio para mejorar sus ventanas.
                </p>
                <textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  disabled={cancelling}
                  placeholder="Ej: ya no puedo ir a esa hora"
                  className="mt-2 w-full rounded-lg border dark:border-gray-700 border-gray-300 dark:bg-gray-800 bg-white p-3 text-sm dark:text-white text-gray-900 placeholder:dark:text-gray-500 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm dark:text-red-300 text-red-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer fijo: siempre visible, con margen para el "indicador de inicio" de iPhone. */}
            <div className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t dark:border-gray-700 border-gray-200 shrink-0 space-y-2">
              {error ? (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={onClose} disabled={cancelling}>
                    Cerrar
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm} loading={cancelling}>
                    Reintentar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={onClose} disabled={cancelling}>
                    Volver
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleConfirm}
                    disabled={!reasonOk}
                    loading={cancelling}
                  >
                    Cancelar reserva
                  </Button>
                </div>
              )}
              {!reasonOk && !error && (
                <p className="text-center text-xs dark:text-gray-500 text-gray-400">
                  Escribe al menos 3 letras para poder cancelar.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function UserReservationsPage() {
  const router = useRouter()
  const { reservations, loading, error: hookError } = useReservations()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState({
    activas: true,
    historial: false,
  })

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }))
  }

  const activeReservations = sortReservationsByPickupTime(reservations.filter((r) => isActiveStatus(r.status)))
  const historyReservations = reservations.filter((r) => !isActiveStatus(r.status))

  const counts = {
    activas: activeReservations.length,
    completadas: reservations.filter((r) => r.status === 'picked_up' || r.status === 'completed').length,
    noRetiradas: reservations.filter((r) => r.status === 'no_show' || r.status === 'expired').length,
    canceladas: reservations.filter((r) => r.status === 'cancelled').length,
  }

  const reservationToCancel = cancellingId
    ? (reservations.find((r) => r.reservation_id === cancellingId) ?? null)
    : null

  if (loading) {
    return <PageLoadingSpinner message="Cargando tus reservas..." />
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        type="reservations"
        action={{
          label: 'Explorar packs',
          onClick: () => router.push('/packs'),
        }}
      />
    )
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Mis Reservas</h1>
          </div>
          <p className="dark:text-gray-400 text-gray-600">Gestiona todos tus packs reservados</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-primary">{counts.activas}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">Activas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-green-400">{counts.completadas}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">Completadas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-orange-400">{counts.noRetiradas}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">No retiradas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-red-400">{counts.canceladas}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">Canceladas</span>
        </div>
      </div>

      {activeReservations.length > 0 && (
        <div className="dark:bg-dark-card/30 bg-gray-50 rounded-2xl border dark:border-dark-border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleGroup('activas')}
            className="w-full flex items-center justify-between p-4 dark:bg-dark-card/50 bg-gray-100 hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="font-semibold dark:text-white text-gray-900">Reservas Activas</h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{counts.activas}</span>
            </div>
            {expandedGroups.activas ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedGroups.activas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-3">
                  {activeReservations.map((reservation) => {
                    const windowLabel = formatPickupWindow(
                      reservation.pickup_start_at,
                      reservation.pickup_end_at,
                      reservation.timezone,
                    )

                    return (
                      <Card key={reservation.reservation_id} glass className="p-5 group border-l-2 border-primary/30">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                                {reservation.pack_title}
                              </h3>
                              <StatusChip status={reservation.status} />
                            </div>

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

                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs dark:text-gray-500 text-gray-400 mt-2">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {windowLabel ?? 'Ventana por definir'}
                              </span>
                              <span className="font-medium dark:text-gray-300 text-gray-600">
                                {formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')}
                              </span>
                              <span>Reservada el {formatDate(reservation.created_at)}</span>
                            </div>

                            {reservation.status === 'payment_pending' && (
                              <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs dark:text-amber-300 text-amber-700">
                                El comercio recibirá tu reserva y la confirmará. Mientras tanto puedes cancelarla.
                              </div>
                            )}
                          </div>

                          {canCancelReservation(reservation).allowed && (
                            <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setCancellingId(reservation.reservation_id)}
                              >
                                Cancelar reserva
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {historyReservations.length > 0 && (
        <div className="dark:bg-dark-card/30 bg-gray-50 rounded-2xl border dark:border-dark-border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleGroup('historial')}
            className="w-full flex items-center justify-between p-4 dark:bg-dark-card/50 bg-gray-100 hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <h3 className="font-semibold dark:text-white text-gray-900">Historial</h3>
              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">
                {historyReservations.length}
              </span>
            </div>
            {expandedGroups.historial ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedGroups.historial && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-3">
                  {historyReservations.map((reservation) => (
                    <Card key={reservation.reservation_id} glass className="p-4 opacity-70">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold dark:text-white text-gray-900">{reservation.pack_title}</h3>
                          <p className="text-sm text-gray-400">{reservation.shop_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatMinorPrice(reservation.total_amount_minor, reservation.currency_code, 'es-CL')} ·{' '}
                            {formatDate(reservation.created_at)}
                          </p>
                          {reservation.status === 'cancelled' && reservation.cancel_reason && (
                            <p className="text-xs text-red-400 mt-1">Motivo: {reservation.cancel_reason}</p>
                          )}
                        </div>
                        <StatusChip status={reservation.status} />
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {reservationToCancel && (
        <CancelReservationModal
          reservation={reservationToCancel}
          isOpen
          onClose={() => setCancellingId(null)}
          onCancelled={() => {
            setCancellingId(null)
            setSuccess('Reserva cancelada correctamente')
          }}
        />
      )}

      {hookError && <Toast message={hookError} type="error" onClose={() => {}} />}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
