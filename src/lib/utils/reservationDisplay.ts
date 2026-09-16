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

/**
 * A-06: la misma lectura, pero para la TARJETA DEL CLIENTE.
 *
 * La función de arriba se usa también en el lado comercio, y ahí su
 * resultado alimenta FILTROS y el validador de códigos: si la ventana cerró
 * y devolviéramos otra cosa, una reserva dejaría de aparecer bajo
 * "Listas para recoger" y el comercio ya no podría validarle el código a un
 * cliente que llegó tarde. Ese pack se perdería por nuestra culpa. Por eso
 * la de arriba NO se toca.
 *
 * Esta solo sirve para pintar la etiqueta que ve el cliente, y es la que
 * cierra el hueco: ventana ya cerrada + 'ready_pickup' crudo = "Ventana
 * cerrada", sin esperar al cron y sin afirmar nada que no se sepa.
 *
 * Igual de pura: el "ahora" entra por parámetro.
 */
export function effectiveReservationStatusForCustomer(
  status: string,
  pickupStartAt: string | null | undefined,
  pickupEndAt: string | null | undefined,
  nowMs: number,
): string {
  if (status !== 'confirmed' && status !== 'ready_pickup') return status

  const end = pickupEndAt ? new Date(pickupEndAt).getTime() : NaN
  if (Number.isNaN(end)) return status

  return nowMs > end ? 'window_closed' : effectiveReservationStatus(status, pickupStartAt, pickupEndAt, nowMs)
}

/** Estados que cuentan como "el usuario YA tiene este pack" (L-10). */
export const OWNED_PACK_STATUSES = ['payment_pending', 'confirmed', 'ready_pickup', 'picked_up'] as const

export function isActiveOwnReservation(status: string): boolean {
  return (OWNED_PACK_STATUSES as readonly string[]).includes(status)
}
