import type { ReservationStatus } from '@/lib/supabase/types'

export type { ReservationStatus }

export interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  confirmed: { label: 'Confirmada', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ready_pickup: {
    label: 'Lista para recoger',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  picked_up: { label: 'Recogido', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  completed: { label: 'Completada', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  cancelled: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  no_show: { label: 'No retirada', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  expired: { label: 'Expirada', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  ready_pickup: 'Lista para recoger',
  picked_up: 'Recogido',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No retirada',
  expired: 'Expirada',
}

export const RESERVATION_COLORS: Record<string, string> = {
  pending: 'text-yellow-500 bg-yellow-500/10',
  confirmed: 'text-green-500 bg-green-500/10',
  ready_pickup: 'text-blue-500 bg-blue-500/10',
  picked_up: 'text-gray-500 bg-gray-500/10',
  cancelled: 'text-red-500 bg-red-500/10',
  expired: 'text-gray-500 bg-gray-500/10',
  no_show: 'text-red-500 bg-red-500/10',
  completed: 'text-green-500 bg-green-500/10',
}

export function sortReservationsByPickupTime<R extends { status: string; pickup_date?: string | null }>(
  reservations: R[],
): R[] {
  return [...reservations].sort((a, b) => {
    const aPriority = a.status === 'confirmed' ? 0 : 1
    const bPriority = b.status === 'confirmed' ? 0 : 1
    if (aPriority !== bPriority) return aPriority - bPriority
    const aDate = a.pickup_date ? new Date(a.pickup_date).getTime() : Infinity
    const bDate = b.pickup_date ? new Date(b.pickup_date).getTime() : Infinity
    return aDate - bDate
  })
}

export function isActiveStatus(status: string): boolean {
  return ['pending', 'confirmed', 'ready_pickup'].includes(status)
}

export function canCancelStatus(status: string): boolean {
  return ['pending', 'confirmed'].includes(status)
}
