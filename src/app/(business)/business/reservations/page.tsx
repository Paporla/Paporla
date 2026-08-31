'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { Calendar, CheckCircle, ShoppingBag } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CopyButton from '@/components/ui/CopyButton'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import ExportCSVButton from '@/components/business/ExportCSVButton'
import TodayPickups from '@/components/business/TodayPickups'
import PickupCodeValidator from '@/components/business/PickupCodeValidator'
import { useBusinessReservations, ReservationItem } from '@/components/business/reservations/useBusinessReservations'
import ReservationStatsBar from '@/components/business/reservations/ReservationStatsBar'
import ReservationFilters from '@/components/business/reservations/ReservationFilters'
import ReservationGroup from '@/components/business/reservations/ReservationGroup'
import { STATUS_LABELS } from '@/lib/constants/reservations'
import { formatDate, formatPickupWindow } from '@/lib/utils/formatDate'

// Agrupa las reservas por estado canónico. "recogidas" une picked_up +
// completed (ambas significan que el pack ya salió del local).
const groupReservations = (reservations: ReservationItem[]) => {
  const byStatus = (status: string) => reservations.filter((r) => r.status === status)
  return {
    payment_pending: byStatus('payment_pending'),
    confirmed: byStatus('confirmed'),
    ready_pickup: byStatus('ready_pickup'),
    recogidas: [...byStatus('picked_up'), ...byStatus('completed')],
    no_show: byStatus('no_show'),
    cancelled: byStatus('cancelled'),
    expired: byStatus('expired'),
  }
}

export default function BusinessReservationsPage() {
  const {
    shopId,
    loading,
    error,
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    reservations,
    stats,
    updating,
    cancelReservation,
    confirmReservation,
    confirmResult,
    setConfirmResult,
  } = useBusinessReservations()

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [reservationToConfirm, setReservationToConfirm] = useState<string | null>(null)

  const grouped = groupReservations(reservations)

  const requestCancel = (id: string) => {
    setReservationToCancel(id)
    setCancelModalOpen(true)
  }

  const requestConfirm = (id: string) => {
    setReservationToConfirm(id)
    setConfirmModalOpen(true)
  }

  const handleCancel = async () => {
    if (reservationToCancel) {
      await cancelReservation(reservationToCancel)
      setCancelModalOpen(false)
      setReservationToCancel(null)
    }
  }

  const handleConfirm = async () => {
    if (reservationToConfirm) {
      await confirmReservation(reservationToConfirm)
      setConfirmModalOpen(false)
      setReservationToConfirm(null)
    }
  }

  if (loading || !shopId) return <LoadingSkeleton />

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Reservas</h1>
          </div>
          <p className="dark:text-gray-400 text-gray-600">Gestiona todas las reservas de tus packs</p>
        </div>
      </div>

      {/* Recogidas de hoy + validador de códigos: reactivados en este paso
          (0031). El comercio confirma (confirm_shop_reservation emite el
          código una sola vez) y valida la llegada con el código
          (validate_pickup). Ambos sobre RPCs canónicas. */}
      <div className="space-y-6">
        <TodayPickups shopId={shopId} />
        <PickupCodeValidator shopId={shopId} />
      </div>

      {/* Estadísticas */}
      <ReservationStatsBar stats={stats} />

      {/* Filtros + Exportar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <ReservationFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>
        {reservations.length > 0 && (
          <ExportCSVButton
            data={reservations.map((r) => ({
              Fecha: r.created_at ? formatDate(r.created_at) : '-',
              Pack: r.pack_title,
              Cliente: r.customer_display_name,
              'Precio (CLP)': r.total_amount_minor,
              Estado: STATUS_LABELS[r.status] ?? r.status,
              Recogida: formatPickupWindow(r.pickup_start_at, r.pickup_end_at, r.timezone),
            }))}
            filename="reservas_paporla"
            label="Exportar CSV"
          />
        )}
      </div>

      {/* Reservas agrupadas por estado */}
      <div className="space-y-4">
        {/* Pendientes de confirmar */}
        {grouped.payment_pending.length > 0 && (
          <ReservationGroup
            title="Pendientes de confirmar"
            reservations={grouped.payment_pending}
            updating={updating}
            onConfirmClick={requestConfirm}
            onCancelClick={requestCancel}
            note="Al confirmar, la reserva pasa a lista para recoger y se genera el código de recogida para tu cliente (se muestra una sola vez)."
          />
        )}

        {/* Confirmadas */}
        {grouped.confirmed.length > 0 && (
          <ReservationGroup
            title="Confirmadas"
            reservations={grouped.confirmed}
            updating={updating}
            onCancelClick={requestCancel}
          />
        )}

        {/* Listas para recoger */}
        {grouped.ready_pickup.length > 0 && (
          <ReservationGroup
            title="Listas para recoger"
            reservations={grouped.ready_pickup}
            updating={updating}
            onCancelClick={requestCancel}
          />
        )}

        {/* Historial */}
        {(grouped.recogidas.length > 0 ||
          grouped.no_show.length > 0 ||
          grouped.cancelled.length > 0 ||
          grouped.expired.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
              <div className="w-1 h-5 dark:bg-gray-600 bg-gray-300 rounded-full" />
              <h2 className="text-lg font-semibold dark:text-gray-400 text-gray-500">Historial</h2>
            </div>

            {grouped.recogidas.length > 0 && (
              <ReservationGroup title="Recogidas" reservations={grouped.recogidas} updating={updating} />
            )}

            {grouped.no_show.length > 0 && (
              <ReservationGroup title="No retiradas" reservations={grouped.no_show} updating={updating} />
            )}

            {grouped.cancelled.length > 0 && (
              <ReservationGroup title="Canceladas" reservations={grouped.cancelled} updating={updating} />
            )}

            {grouped.expired.length > 0 && (
              <ReservationGroup title="Expiradas" reservations={grouped.expired} updating={updating} />
            )}
          </div>
        )}

        {/* Sin reservas */}
        {reservations.length === 0 && (
          <Card glass className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-primary" />
            </div>
            <p className="dark:text-gray-400 text-gray-500">No hay reservas</p>
            <p className="text-xs text-gray-500 mt-1">Las reservas aparecerán aquí cuando lleguen</p>
          </Card>
        )}
      </div>

      {/* Modal de confirmación para cancelar */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        message="¿Estás seguro de que quieres cancelar esta reserva? El stock se reintegrará al pack y esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />

      {/* Modal de confirmación para confirmar (piloto sin pagos, 0031) */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        title="Confirmar reserva"
        message="¿Confirmar esta reserva? Se generará el código de recogida para tu cliente y esta acción no se puede deshacer."
        confirmText="Sí, confirmar"
        cancelText="Volver"
      />

      {/* Modal del código de recogida: se muestra UNA sola vez (en la base
          solo vive su huella sha256, 0031). */}
      {confirmResult && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 dark:bg-black/80 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <div className="dark:bg-gray-900 bg-white rounded-2xl border dark:border-gray-700 border-gray-200 shadow-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
                  {confirmResult.code ? '¡Reserva confirmada!' : 'Reserva ya confirmada'}
                </h3>
                {confirmResult.code ? (
                  <>
                    <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">{confirmResult.packTitle}</p>
                    <div className="dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-xl p-4 mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Código de recogida</p>
                      <p className="text-3xl font-mono font-bold tracking-widest text-primary">{confirmResult.code}</p>
                    </div>
                    <div className="flex justify-center mb-3">
                      <CopyButton text={confirmResult.code} />
                    </div>
                    <p className="text-xs dark:text-gray-400 text-gray-600">
                      Este código se muestra una sola vez: compártelo con tu cliente ahora, porque no se podrá volver a
                      ver.
                    </p>
                  </>
                ) : (
                  <p className="dark:text-gray-400 text-gray-600 text-sm">
                    {confirmResult.note} El código se mostró cuando se confirmó la reserva y no se puede volver a ver.
                  </p>
                )}
              </div>
              <div className="flex gap-3 p-4 pt-0">
                <Button onClick={() => setConfirmResult(null)} variant="primary" className="flex-1">
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </motion.div>
  )
}
