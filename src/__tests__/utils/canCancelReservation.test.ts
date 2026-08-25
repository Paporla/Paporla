import { describe, it, expect } from 'vitest'
import { canCancelReservation } from '@/lib/utils/canCancelReservation'

/**
 * Este helper decide SOLO por estado (misma lista que cancel_reservation,
 * 0009:366). El plazo (corte del mercado) lo decide la base de datos: si ya
 * pasó, el error CANCELLATION_WINDOW_CLOSED llega traducido por
 * translateDbError. Por eso no hay tests de tiempo aquí: un "confirmed" con
 * recogida en 5 minutos es allowed=true, y la base responde con el error de
 * plazo si corresponde.
 */
describe('canCancelReservation', () => {
  it('permite cancelar payment_pending, confirmed y ready_pickup', () => {
    for (const status of ['payment_pending', 'confirmed', 'ready_pickup']) {
      expect(canCancelReservation({ status }).allowed).toBe(true)
    }
  })

  it('niega cancelar el historial, con un motivo legible', () => {
    for (const status of ['picked_up', 'completed', 'cancelled', 'no_show', 'expired']) {
      const result = canCancelReservation({ status })
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeTruthy()
    }
  })

  it('niega el estado legacy "pending" (el lado user no lo conoce)', () => {
    expect(canCancelReservation({ status: 'pending' }).allowed).toBe(false)
  })

  it('no inventa reglas de tiempo: con 5 min para la recogida sigue permitido', () => {
    // El corte lo aplica la base, no el cliente.
    expect(canCancelReservation({ status: 'confirmed' }).allowed).toBe(true)
  })
})
