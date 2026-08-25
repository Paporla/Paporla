// ============================================
// TIPOS CANONICOS — Reservas del usuario
// ============================================
// `MyReservation` es una fila de `list_my_reservations` (migración
// 0014:281): es TODO lo que la base de datos expone al usuario. Son
// snapshots de pack y comercio (la reserva no se une a las tablas
// originales), el importe en la unidad menor de su moneda y la ventana de
// recogida con la zona horaria del mercado.
//
// Lo que NO hay y NO debe haber aquí:
//   - pickup_code / código de recogida: no existe hasta la fase 4 (lo emite
//     el comercio al confirmar). La UI no debe inventarlo.
//   - quantity: una reserva de usuario es siempre 1 pack (la RPC de
//     creación no tiene parámetro de cantidad).
//   - total_price_cents / pickup_date / pickup_start_time / pickup_code:
//     columnas de la tabla legacy; el lado user no las conoce. La tabla
//     legacy sigue en uso por el lado business/admin hasta la fase 4, por
//     eso el tipo legacy `Reservation` permanece en @/lib/supabase/types.
export interface MyReservation {
  reservation_id: string
  shop_id: string
  pack_id: string
  pack_title: string
  shop_name: string
  shop_address: string
  /** Estado canónico: ver RESERVATION_STATUSES en @/lib/constants/reservations. */
  status: string
  payment_status: string
  /** Importe en unidad menor de currency_code (CLP: pesos, sin centavos). */
  total_amount_minor: number
  currency_code: string
  pickup_start_at: string
  pickup_end_at: string
  /** Zona horaria del mercado al reservar (p. ej. America/Santiago). */
  timezone: string
  /** Motivo de cancelación; solo tiene valor cuando status = 'cancelled'. */
  cancel_reason: string | null
  created_at: string
}
