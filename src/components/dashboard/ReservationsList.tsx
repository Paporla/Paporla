'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package } from 'lucide-react';
import Card from '@/components/ui/Card';
import ReservationCard from './ReservationCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { Reservation } from '@/types/reservation';

interface ReservationsListProps {
  reservations: Reservation[];
  title: string;
  icon: React.ElementType;
  showCancel?: boolean;
  onCancel?: (id: string) => void;
  emptyStateType?: 'reservations' | 'packs';
  emptyStateAction?: { label: string; onClick: () => void };
}

export default function ReservationsList({
  reservations,
  title,
  icon: Icon,
  showCancel = false,
  onCancel,
  emptyStateType = 'reservations',
  emptyStateAction,
}: ReservationsListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  const handleCancelClick = (id: string) => {
    setSelectedReservationId(id);
    setModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (selectedReservationId && onCancel) {
      onCancel(selectedReservationId);
    }
    setModalOpen(false);
    setSelectedReservationId(null);
  };

  if (reservations.length === 0) {
    return (
      <EmptyState
        type={emptyStateType}
        action={emptyStateAction}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          {title}
          {reservations.length > 0 && (
            <span className="text-sm text-gray-400 ml-2">({reservations.length})</span>
          )}
        </h2>

        <div className="space-y-4">
          {reservations.map((reservation, idx) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ReservationCard
                reservation={reservation}
                showCancel={showCancel}
                onCancel={() => handleCancelClick(reservation.id)}
                cancelling={cancellingId === reservation.id ? cancellingId : null}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancelar reserva"
        message="¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />
    </>
  );
}