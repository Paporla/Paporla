/**
 * L-02: etiquetas de estado honestas.
 *
 * En el piloto, al confirmar el comercio la reserva SALTA directo a
 * 'ready_pickup' (atajo sin pagos), y el cron service_open_pickup_windows
 * solo tiene sentido cuando hay flujo con pagos. Consecuencia: una reserva
 * confirmada a las 10:00 para una ventana de 18:00 llevaba horas diciendo
 * "Lista para recoger" — mentira verde con pulsito.
 *
 * La verdad no está (solo) en el estado: está en el estado MIRANDO EL RELOJ.
 * Esta función devuelve el estado QUE TOCA MOSTRAR:
 *
 *  - confirmada/lista con ventana AÚN CERRADA  → 'confirmed'  (L-02)
 *  - confirmada/lista con ventana ABIERTA      → 'ready_pickup' (aunque el
 *    cron se retrasara, la ventana manda)
 *  - ventana YA CERRADA                        → el estado crudo (el cron de
 *    no_show decidirá el destino; pintar otra cosa aquí sería otra mentira)
 *  - sin ventana o fechas inválidas            → el estado crudo (nunca
 *    inventamos una ventana que no llegó)
 *
 * Pura y sin Date.now() interno: el "ahora" entra por parámetro para que los
 * tests sean deterministas y los componentes decidan cada cuánto repintar.
 */
export function effectiveReservationStatus(
  status: string,
  pickupStartAt: string | null | undefined,
  pickupEndAt: string | null | undefined,
  nowMs: number,
): string {
  if (status !== 'confirmed' && status !== 'ready_pickup') return status

  const start = pickupStartAt ? new Date(pickupStartAt).getTime() : NaN
  const end = pickupEndAt ? new Date(pickupEndAt).getTime() : NaN
  if (Number.isNaN(start) || Number.isNaN(end)) return status

  if (nowMs < start) return 'confirmed'
  if (nowMs <= end) return 'ready_pickup'
  return status
}

/** Estados que cuentan como "el usuario YA tiene este pack" (L-10). */
export const OWNED_PACK_STATUSES = ['payment_pending', 'confirmed', 'ready_pickup', 'picked_up'] as const

export function isActiveOwnReservation(status: string): boolean {
  return (OWNED_PACK_STATUSES as readonly string[]).includes(status)
}
