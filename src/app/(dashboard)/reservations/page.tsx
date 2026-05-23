'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, CheckCircle, XCircle, Ban, ChevronDown, ChevronUp, MapPin, AlertCircle } from 'lucide-react'
import { useReservations } from '@/hooks/useReservations'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import PageLoadingSpinner from '@/components/ui/PageLoadingSpinner'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import { canCancelReservation } from '@/lib/utils/canCancelReservation'
import { STATUS_CONFIG } from '@/lib/constants/reservations'

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: CheckCircle,
  ready_pickup: Clock,
  picked_up: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
  no_show: AlertCircle,
  expired: Ban,
}

export default function UserReservationsPage() {
  const { reservations, loading, error: hookError, cancelReservation } = useReservations()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null)

  const [expandedGroups, setExpandedGroups] = useState({
    activas: true,
    completadas: false,
    noRetiradas: false,
    canceladas: false,
  })

  const handleCancelClick = (id: string) => {
    const reservation = reservations.find((r) => r.id === id)
    if (!reservation) return

    const cancelCheck = canCancelReservation({
      status: reservation.status,
      pickup_date: reservation.pickup_date,
      pickup_start_time: reservation.pickup_end_time,
    })

    if (!cancelCheck.allowed) {
      setError(cancelCheck.reason || 'No puedes cancelar esta reserva')
      return
    }

    setReservationToCancel(id)
    setModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!reservationToCancel) return

    setCancelling(reservationToCancel)

    try {
      await cancelReservation({ reservationId: reservationToCancel })
      setSuccess('Reserva cancelada correctamente')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la reserva')
    }

    setCancelling(null)
    setModalOpen(false)
    setReservationToCancel(null)
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group as keyof typeof prev],
    }))
  }

  const activeReservations = reservations.filter((r) => ['pending', 'confirmed', 'ready_pickup'].includes(r.status))
  const completedReservations = reservations.filter((r) => ['picked_up', 'completed'].includes(r.status))
  const noShowReservations = reservations.filter((r) => ['no_show', 'expired'].includes(r.status))
  const cancelledReservations = reservations.filter((r) => r.status === 'cancelled')

  if (loading) {
    return <PageLoadingSpinner message="Cargando tus reservas..." />
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        type="reservations"
        action={{
          label: 'Explorar packs',
          onClick: () => (window.location.href = '/packs'),
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
          <span className="text-2xl font-bold text-primary">{activeReservations.length}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">Activas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-green-400">{completedReservations.length}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">Completadas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-orange-400">{noShowReservations.length}</span>
          <span className="text-sm dark:text-gray-400 text-gray-600 ml-2">No retiradas</span>
        </div>
        <div className="dark:bg-black/40 bg-gray-100 border dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-red-400">{cancelledReservations.length}</span>
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
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {activeReservations.length}
              </span>
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
                    const config = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending
                    const StatusIcon = statusIcons[reservation.status] || Clock

                    return (
                      <Card key={reservation.id} glass className="p-5 group border-l-2 border-primary/30">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                                {reservation.pack?.title || 'Pack'}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                            </div>

                            <Link href={`/shops/${reservation.shop?.id}`}>
                              <p className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary transition-colors">
                                {reservation.shop?.name || 'Comercio'}
                              </p>
                            </Link>

                            {reservation.shop?.address && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {reservation.shop.address}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-3 text-xs dark:text-gray-500 text-gray-400 mt-2">
                              <span>{formatDate(reservation.created_at)}</span>
                              <span>
                                {formatPrice(reservation.total_price_cents)} ({reservation.quantity || 1}x)
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {reservation.pickup_code && (
                              <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5">
                                <p className="text-[10px] dark:text-gray-400 text-gray-600">Codigo</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-lg font-bold text-primary tracking-wider font-mono">
                                    {reservation.pickup_code}
                                  </p>
                                  <CopyButton text={reservation.pickup_code} label="" />
                                </div>
                              </div>
                            )}

                            {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelClick(reservation.id)}
                                loading={cancelling === reservation.id}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>

                        {reservation.pickup_date && reservation.pickup_end_time && (
                          <div className="mt-3 pt-3 border-t border-dark-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Recoge antes de:</span>
                              <span className="text-primary font-mono">
                                {new Date(reservation.pickup_date).toLocaleDateString()} -{' '}
                                {reservation.pickup_end_time.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {completedReservations.length > 0 && (
        <div className="dark:bg-dark-card/30 bg-gray-50 rounded-2xl border dark:border-dark-border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleGroup('completadas')}
            className="w-full flex items-center justify-between p-4 dark:bg-dark-card/50 bg-gray-100 hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h3 className="font-semibold dark:text-white text-gray-900">Completadas</h3>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                {completedReservations.length}
              </span>
            </div>
            {expandedGroups.completadas ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedGroups.completadas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-3">
                  {completedReservations.map((reservation) => {
                    const config = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending
                    const StatusIcon = statusIcons[reservation.status] || Clock

                    return (
                      <Card key={reservation.id} glass className="p-4 opacity-70">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold dark:text-white text-gray-900">
                              {reservation.pack?.title || 'Pack'}
                            </h3>
                            <p className="text-sm text-gray-400">{reservation.shop?.name || 'Comercio'}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatPrice(reservation.total_price_cents)}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
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

      {noShowReservations.length > 0 && (
        <div className="dark:bg-dark-card/30 bg-gray-50 rounded-2xl border dark:border-dark-border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleGroup('noRetiradas')}
            className="w-full flex items-center justify-between p-4 dark:bg-dark-card/50 bg-gray-100 hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <h3 className="font-semibold dark:text-white text-gray-900">No retiradas / Caducadas</h3>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {noShowReservations.length}
              </span>
            </div>
            {expandedGroups.noRetiradas ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedGroups.noRetiradas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-3">
                  {noShowReservations.map((reservation) => {
                    const config = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending
                    const StatusIcon = statusIcons[reservation.status] || Clock

                    return (
                      <Card key={reservation.id} glass className="p-4 opacity-60 border-l-2 border-orange-500/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold dark:text-white text-gray-900">
                              {reservation.pack?.title || 'Pack'}
                            </h3>
                            <p className="text-sm text-gray-400">{reservation.shop?.name || 'Comercio'}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatPrice(reservation.total_price_cents)}</p>
                            {reservation.pickup_date && (
                              <p className="text-[10px] text-orange-400 mt-1">
                                Vencia: {new Date(reservation.pickup_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
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

      {cancelledReservations.length > 0 && (
        <div className="dark:bg-dark-card/30 bg-gray-50 rounded-2xl border dark:border-dark-border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleGroup('canceladas')}
            className="w-full flex items-center justify-between p-4 dark:bg-dark-card/50 bg-gray-100 hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <h3 className="font-semibold dark:text-white text-gray-900">Canceladas</h3>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {cancelledReservations.length}
              </span>
            </div>
            {expandedGroups.canceladas ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedGroups.canceladas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 space-y-3">
                  {cancelledReservations.map((reservation) => {
                    const config = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending
                    const StatusIcon = statusIcons[reservation.status] || Clock

                    return (
                      <Card key={reservation.id} glass className="p-4 opacity-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold dark:text-white text-gray-900">
                              {reservation.pack?.title || 'Pack'}
                            </h3>
                            <p className="text-sm text-gray-400">{reservation.shop?.name || 'Comercio'}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatPrice(reservation.total_price_cents)}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
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

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancelar reserva"
        message="Estas seguro de que quieres cancelar esta reserva? Esta accion no se puede deshacer."
        confirmText="Si, cancelar"
        cancelText="Volver"
      />

      {hookError && <Toast message={hookError} type="error" onClose={() => {}} />}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
