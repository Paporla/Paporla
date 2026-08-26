'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { Calendar, ShoppingBag } from 'lucide-react'
import Card from '@/components/ui/Card'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import ExportCSVButton from '@/components/business/ExportCSVButton'
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
  } = useBusinessReservations()

  const [modalOpen, setModalOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null)

  const grouped = groupReservations(reservations)

  const confirmCancel = (id: string) => {
    setReservationToCancel(id)
    setModalOpen(true)
  }

  const handleCancel = async () => {
    if (reservationToCancel) {
      await cancelReservation(reservationToCancel)
      setModalOpen(false)
      setReservationToCancel(null)
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

      {/*
        Recogidas de hoy + validador de códigos: OCULTOS temporalmente.
        Esos dos componentes siguen leyendo la tabla legacy sin permiso
        (42501); se reconectan en el siguiente paso del piloto junto con la
        confirmación del comercio y el código de recogida. (F2b: el
        control deshabilitado siempre dice por qué.)
      */}
      <Card glass className="p-5 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 inline-flex shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold dark:text-white text-gray-900">
            Recogidas de hoy y validación de códigos
          </p>
          <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">
            Estos controles vuelven activos en el próximo paso del piloto: aquí verás las recogidas del día y podrás
            validar el código de recogida. Mientras tanto, gestiona las reservas de la lista de abajo.
          </p>
        </div>
      </Card>

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
            onCancelClick={confirmCancel}
            note="La confirmación y el código de recogida para el cliente se activan en el próximo paso del piloto. Por ahora la reserva queda aguardando y el stock ya está apartado."
          />
        )}

        {/* Confirmadas */}
        {grouped.confirmed.length > 0 && (
          <ReservationGroup
            title="Confirmadas"
            reservations={grouped.confirmed}
            updating={updating}
            onCancelClick={confirmCancel}
          />
        )}

        {/* Listas para recoger */}
        {grouped.ready_pickup.length > 0 && (
          <ReservationGroup
            title="Listas para recoger"
            reservations={grouped.ready_pickup}
            updating={updating}
            onCancelClick={confirmCancel}
          />
        )}

        {/* Historial */}
        {(grouped.recogidas.length > 0 ||
          grouped.no_show.length > 0 ||
          grouped.cancelled.length > 0 ||
          grouped.expired.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-dark-border">
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        message="¿Estás seguro de que quieres cancelar esta reserva? El stock se reintegrará al pack y esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />

      {/* Toasts */}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </motion.div>
  )
}
