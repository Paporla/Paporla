'use client'

import { useState } from 'react'
import { Calendar, ShoppingBag } from 'lucide-react'
import Card from '@/components/ui/Card'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import TodayPickups from '@/components/business/TodayPickups'
import PickupCodeValidator from '@/components/business/PickupCodeValidator'
import { useBusinessReservations, ReservationItem } from '@/components/business/reservations/useBusinessReservations'
import ReservationStatsBar from '@/components/business/reservations/ReservationStatsBar'
import ReservationFilters from '@/components/business/reservations/ReservationFilters'
import ReservationGroup from '@/components/business/reservations/ReservationGroup'

// Agrupar reservas por estado
const groupReservations = (reservations: ReservationItem[]) => {
  return {
    ready_pickup: reservations.filter((r) => r.status === 'ready_pickup'),
    pending: reservations.filter((r) => r.status === 'pending'),
    confirmed: reservations.filter((r) => r.status === 'confirmed'),
    picked_up: reservations.filter((r) => r.status === 'picked_up'),
    no_show: reservations.filter((r) => r.status === 'no_show'),
    cancelled: reservations.filter((r) => r.status === 'cancelled'),
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
    updateStatus,
  } = useBusinessReservations()

  const [modalOpen, setModalOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayCount = reservations.filter((r) => r.created_at?.startsWith(today)).length

  const grouped = groupReservations(reservations)

  const confirmCancel = (id: string) => {
    setReservationToCancel(id)
    setModalOpen(true)
  }

  const handleCancel = async () => {
    if (reservationToCancel) {
      await updateStatus(reservationToCancel, 'cancelled')
      setModalOpen(false)
      setReservationToCancel(null)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-8 pb-8">
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

      {/* Validador y recogidas del día */}
      {shopId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PickupCodeValidator />
          <TodayPickups shopId={shopId} />
        </div>
      )}

      {/* Estadísticas */}
      <ReservationStatsBar stats={{ ...stats, todayCount }} />

      {/* Filtros */}
      <ReservationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Reservas agrupadas por estado */}
      <div className="space-y-4">
        {/* Listas para recoger */}
        {grouped.ready_pickup.length > 0 && (
          <ReservationGroup
            title="Listas para recoger"
            reservations={grouped.ready_pickup}
            updating={updating}
            onValidate={(id) => updateStatus(id, 'picked_up')}
            onNoShow={(id) => updateStatus(id, 'no_show')}
            onCancelClick={confirmCancel}
          />
        )}

        {/* Pendientes */}
        {grouped.pending.length > 0 && (
          <ReservationGroup
            title="Pendientes"
            reservations={grouped.pending}
            updating={updating}
            onValidate={(id) => updateStatus(id, 'confirmed')}
            onNoShow={(id) => updateStatus(id, 'no_show')}
            onCancelClick={confirmCancel}
          />
        )}

        {/* Confirmadas */}
        {grouped.confirmed.length > 0 && (
          <ReservationGroup
            title="Confirmadas"
            reservations={grouped.confirmed}
            updating={updating}
            onValidate={(id) => updateStatus(id, 'picked_up')}
            onNoShow={(id) => updateStatus(id, 'no_show')}
            onCancelClick={confirmCancel}
          />
        )}

        {/* Historial */}
        {(grouped.picked_up.length > 0 || grouped.no_show.length > 0 || grouped.cancelled.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-dark-border">
              <div className="w-1 h-5 dark:bg-gray-600 bg-gray-300 rounded-full" />
              <h2 className="text-lg font-semibold dark:text-gray-400 text-gray-500">Historial</h2>
            </div>

            {grouped.picked_up.length > 0 && (
              <ReservationGroup title="Recogidas" reservations={grouped.picked_up} updating={updating} />
            )}

            {grouped.no_show.length > 0 && (
              <ReservationGroup title="No retiradas" reservations={grouped.no_show} updating={updating} />
            )}

            {grouped.cancelled.length > 0 && (
              <ReservationGroup title="Canceladas" reservations={grouped.cancelled} updating={updating} />
            )}
          </div>
        )}

        {/* Sin reservas */}
        {reservations.length === 0 && (
          <Card glass className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-primary" />
            </div>
            <p className="text-gray-400">No hay reservas</p>
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
        message="¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />

      {/* Toasts */}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
