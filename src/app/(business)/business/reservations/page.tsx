'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import TodayPickups from '@/components/business/TodayPickups';
import PickupCodeValidator from '@/components/business/PickupCodeValidator';
import { useBusinessReservations } from '@/components/business/reservations/useBusinessReservations';
import ReservationStatsBar from '@/components/business/reservations/ReservationStatsBar';
import ReservationFilters from '@/components/business/reservations/ReservationFilters';
import ReservationCard from '@/components/business/reservations/ReservationCard';

export default function BusinessReservationsPage() {
  const {
    shopId, loading, error, success, setError, setSuccess,
    searchTerm, setSearchTerm, statusFilter, setStatusFilter,
    reservations, stats, updating, updateStatus,
  } = useBusinessReservations();

  const [modalOpen, setModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  const confirmCancel = (id: string) => {
    setReservationToCancel(id);
    setModalOpen(true);
  };

  const handleCancel = async () => {
    if (reservationToCancel) {
      await updateStatus(reservationToCancel, 'cancelled');
      setModalOpen(false);
      setReservationToCancel(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Reservas</h1>
            <p className="text-gray-400">Gestiona todas las reservas de tus packs</p>
          </div>
        </div>
      </div>

      {shopId && (
        <>
          <div className="mb-6">
            <PickupCodeValidator />
          </div>
          <div className="mb-8">
            <TodayPickups shopId={shopId} />
          </div>
        </>
      )}

      <ReservationStatsBar stats={stats} />

      <ReservationFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {reservations.length === 0 ? (
        <Card glass className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <p className="text-gray-400">No hay reservas</p>
          <p className="text-xs text-gray-500 mt-1">Las reservas aparecerán aquí cuando lleguen</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation, index) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              index={index}
              updating={updating}
              onValidate={(id) => updateStatus(id, 'picked_up')}
              onNoShow={(id) => updateStatus(id, 'no_show')}
              onCancelClick={confirmCancel}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        message="¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}
