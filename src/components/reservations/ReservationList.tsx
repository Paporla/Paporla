'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import ReservationCard from './ReservationCard';
import ReservationListSkeleton from './ReservationListSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { ReservationWithDetails } from '@/types/reservation';

interface ReservationListProps {
  reservations: ReservationWithDetails[];
  loading?: boolean;
  onCancel?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onComplete?: (id: string) => void;
  showUserDetails?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'ready_pickup', label: 'Listas para recoger' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

export default function ReservationList({
  reservations,
  loading,
  onCancel,
  onConfirm,
  onComplete,
  showUserDetails = false,
}: ReservationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch = searchTerm === '' ||
      res.pack.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.shop.name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = ['pending', 'confirmed', 'ready_pickup'].includes(res.status);
    } else if (statusFilter !== 'all') {
      matchesStatus = res.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <ReservationListSkeleton />;
  }

  if (filteredReservations.length === 0) {
    return (
      <EmptyState
        type="reservations"
        action={searchTerm || statusFilter !== 'all' ? {
          label: 'Limpiar filtros',
          onClick: () => {
            setSearchTerm('');
            setStatusFilter('all');
          },
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por pack o comercio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-muted border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-dark-muted border border-dark-border rounded-xl text-sm text-white focus:border-primary focus:outline-none transition-all"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de reservas */}
      <div className="space-y-3">
        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onCancel={onCancel}
            onConfirm={onConfirm}
            onComplete={onComplete}
            showUserDetails={showUserDetails}
          />
        ))}
      </div>
    </div>
  );
}