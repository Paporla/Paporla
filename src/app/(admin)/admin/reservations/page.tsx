'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, Search, Filter } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import { translateDbError } from '@/lib/utils/db-errors'
import { useAdminReservations, AdminReservationRow } from '@/components/admin/useAdminReservations'
import { RESERVATION_STATUSES, getReservationStatusConfig } from '@/lib/constants/reservationStatus'
import ReservationsTable from '../components/ReservationsTable'
import ReservationModal from '../components/ReservationModal'

/**
 * Página /admin/reservations (ADMIN-1): soporte de reservas del panel.
 *
 * Antes (Fase 6.5) era una tabla de solo lectura servida desde el servidor:
 * imposible ubicar la reserva de un comprador que escribe por soporte. Ahora:
 *  - Datos por la RPC canónica `list_admin_reservations` (0032) vía
 *    useAdminReservations (límite 500, el máximo de la RPC).
 *  - Búsqueda y filtro por estado EN EL CLIENTE (mismo patrón que la
 *    búsqueda de comercios; con +500 reservas se migran a la RPC, ver hook).
 *  - Ficha de detalle por reserva (ReservationModal), solo lectura.
 *
 * NOTA: NO se puede buscar por código de retiro — vive hasheado en la base
 * (0005) a propósito. La búsqueda es por comprador/pack/comercio/id.
 */
export default function AdminReservationsPage() {
  const { reservations, loading, error } = useAdminReservations()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<AdminReservationRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const openReservation = (reservation: AdminReservationRow) => {
    setSelected(reservation)
    setModalOpen(true)
  }

  /** Cuentas por estado para los chips (sobre TODO el listado, no el filtrado). */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of reservations) {
      counts[r.status] = (counts[r.status] ?? 0) + 1
    }
    return counts
  }, [reservations])

  /** Búsqueda por comprador (nombre/email), pack, comercio o id de reserva. */
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return reservations.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!q) return true
      const haystack = [r.user_name ?? '', r.user_email ?? '', r.pack_title ?? '', r.shop_name ?? '', r.reservation_id]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [reservations, statusFilter, searchTerm])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const hayFiltros = statusFilter !== 'all' || searchTerm.trim() !== ''
  const truncated = reservations.length >= 500

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Reservas</h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              {hayFiltros
                ? `${filtered.length} de ${reservations.length} reservas`
                : `${reservations.length} ${
                    reservations.length === 1 ? 'reserva' : 'reservas'
                  } en total — todas las transacciones`}
              {truncated ? ' (mostrando las 500 más recientes)' : ''}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar reservas: {translateDbError(error)}</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay reservas registradas</p>
        </div>
      ) : (
        <>
          {/* Chips de filtro por estado, con conteo sobre el total (patrón comercios) */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
              }`}
            >
              Todas ({reservations.length})
            </button>
            {RESERVATION_STATUSES.map((status) => {
              const config = getReservationStatusConfig(status)
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-on-primary'
                      : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
                  }`}
                >
                  {config.label} ({statusCounts[status] ?? 0})
                </button>
              )
            })}
          </div>

          {/* Barra de búsqueda (por comprador, pack, comercio o id — NUNCA por código de retiro: vive hasheado) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
              <Input
                placeholder="Buscar por comprador, email, pack o comercio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Mostrando: {filtered.length}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="dark:text-gray-400 text-gray-600 font-medium mb-1">
                Ninguna reserva coincide con la búsqueda
              </p>
              <p className="dark:text-gray-500 text-gray-400 text-sm mb-4">
                Prueba con otro nombre, email o comercio (el código de retiro no es buscable: vive cifrado en la base).
              </p>
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <ReservationsTable rows={filtered} onOpen={openReservation} />
          )}
        </>
      )}

      <ReservationModal
        key={selected?.reservation_id ?? 'none'}
        isOpen={modalOpen}
        reservation={selected}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
