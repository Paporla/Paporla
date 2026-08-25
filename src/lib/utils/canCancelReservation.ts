import { canCancelStatus } from '@/lib/constants/reservations'

/**
 * ¿Puede el usuario cancelar esta reserva?
 *
 * Aquí solo se mira el ESTADO. El plazo (corte de cancelación según el
 * mercado, markets.cancellation_cutoff_minutes) lo decide la base de datos
 * DENTRO de cancel_reservation: si ya pasó, el error
 * CANCELLATION_WINDOW_CLOSED llega traducido por translateDbError y se
 * muestra en pantalla. No se replica ese cálculo en el cliente: el cliente
 * no conoce el corte del mercado y terminaría inventando una regla mentirosa.
 */
export function canCancelReservation(reservation: { status: string }): { allowed: boolean; reason?: string } {
  if (canCancelStatus(reservation.status)) return { allowed: true }

  return {
    allowed: false,
    reason: 'Esta reserva ya no está en una etapa que se pueda cancelar.',
  }
}
