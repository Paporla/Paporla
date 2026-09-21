/**
 * Diccionarios de presentación para estados de reserva (ADMIN-1).
 *
 * Un solo lugar para etiquetas y colores de los badges: lo usan la tabla y
 * la ficha del panel admin (/admin/reservations). Los valores son EXACTAMENTE
 * los de los CHECK `reservations_status_check` y
 * `reservations_payment_status_check` de 0005_reservations_payments.sql —
 * consultar los check constraints antes de agregar uno nuevo (lección del
 * contexto signup, maestro 20.23).
 */

/** Estados de la reserva (CHECK reservations_status_check, 0005). */
export const RESERVATION_STATUSES = [
  'payment_pending',
  'confirmed',
  'ready_pickup',
  'picked_up',
  'completed',
  'cancelled',
  'no_show',
  'expired',
] as const

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export const reservationStatusConfig: Record<string, { label: string; className: string }> = {
  payment_pending: { label: 'Pago pendiente', className: 'bg-amber-500/10 text-amber-400' },
  confirmed: { label: 'Confirmada', className: 'bg-blue-500/10 text-blue-400' },
  ready_pickup: { label: 'Lista para recoger', className: 'bg-primary/10 text-primary' },
  picked_up: { label: 'Recogida', className: 'bg-green-500/10 text-green-400' },
  completed: { label: 'Completada', className: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-400' },
  no_show: { label: 'No show', className: 'bg-orange-500/10 text-orange-400' },
  expired: { label: 'Expirada', className: 'bg-gray-500/10 text-gray-400' },
}

/** Config de un estado de reserva desconocido (la base puede crecer): lo muestra crudo, sin inventar. */
export function getReservationStatusConfig(status: string): { label: string; className: string } {
  return (
    reservationStatusConfig[status] ?? {
      label: status,
      className: 'bg-gray-500/10 text-gray-400',
    }
  )
}

/** Estados de pago (CHECK reservations_payment_status_check, 0005). */
export const PAYMENT_STATUSES = [
  'created',
  'pending',
  'authorized',
  'capture_pending',
  'paid',
  'failed',
  'voided',
  'cancelled',
  'refund_pending',
  'refunded',
  'partially_refunded',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  created: { label: 'Creada', className: 'bg-gray-500/10 text-gray-400' },
  pending: { label: 'Pago pendiente', className: 'bg-amber-500/10 text-amber-400' },
  authorized: { label: 'Autorizado', className: 'bg-blue-500/10 text-blue-400' },
  capture_pending: { label: 'Cobro pendiente', className: 'bg-amber-500/10 text-amber-400' },
  paid: { label: 'Pagado', className: 'bg-green-500/10 text-green-400' },
  failed: { label: 'Fallido', className: 'bg-red-500/10 text-red-400' },
  voided: { label: 'Anulado', className: 'bg-gray-500/10 text-gray-400' },
  cancelled: { label: 'Cancelado', className: 'bg-red-500/10 text-red-400' },
  refund_pending: { label: 'Reembolso pendiente', className: 'bg-orange-500/10 text-orange-400' },
  refunded: { label: 'Reembolsado', className: 'bg-purple-500/10 text-purple-400' },
  partially_refunded: { label: 'Reembolso parcial', className: 'bg-purple-500/10 text-purple-400' },
}

/** Config de un estado de pago desconocido: lo muestra crudo, sin inventar. */
export function getPaymentStatusConfig(status: string): { label: string; className: string } {
  return (
    paymentStatusConfig[status] ?? {
      label: status,
      className: 'bg-gray-500/10 text-gray-400',
    }
  )
}
