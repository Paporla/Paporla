import { describe, it, expect } from 'vitest'
import { effectiveReservationStatus, isActiveOwnReservation } from '@/lib/utils/reservationDisplay'

/**
 * L-02: la etiqueta mira el reloj, no solo el estado. En el piloto el
 * comercio confirma y la reserva salta a ready_pickup al instante; sin esta
 * lógica, una ventana que abre en 6 horas llevaría 6 horas mintiendo.
 */
const START = '2026-09-11T18:00:00.000Z'
const END = '2026-09-11T20:00:00.000Z'
const BEFORE = new Date('2026-09-11T12:00:00.000Z').getTime()
const INSIDE = new Date('2026-09-11T19:00:00.000Z').getTime()
const AFTER = new Date('2026-09-11T21:00:00.000Z').getTime()

describe('effectiveReservationStatus', () => {
  it('ready_pickup con ventana cerrada aún es Confirmada (el bug de L-02)', () => {
    expect(effectiveReservationStatus('ready_pickup', START, END, BEFORE)).toBe('confirmed')
  })

  it('confirmed con ventana cerrada sigue Confirmada', () => {
    expect(effectiveReservationStatus('confirmed', START, END, BEFORE)).toBe('confirmed')
  })

  it('confirmada o lista con ventana ABIERTA = Lista para recoger (aunque el cron se retrase)', () => {
    expect(effectiveReservationStatus('confirmed', START, END, INSIDE)).toBe('ready_pickup')
    expect(effectiveReservationStatus('ready_pickup', START, END, INSIDE)).toBe('ready_pickup')
  })

  it('ventana ya cerrada: el estado crudo manda (el cron de no_show decide)', () => {
    expect(effectiveReservationStatus('ready_pickup', START, END, AFTER)).toBe('ready_pickup')
    expect(effectiveReservationStatus('confirmed', START, END, AFTER)).toBe('confirmed')
  })

  it('otros estados no se tocan', () => {
    for (const st of ['payment_pending', 'picked_up', 'completed', 'cancelled', 'no_show', 'expired']) {
      expect(effectiveReservationStatus(st, START, END, BEFORE)).toBe(st)
      expect(effectiveReservationStatus(st, START, END, INSIDE)).toBe(st)
    }
  })

  it('sin ventana o con fechas inválidas: nunca inventa una ventana', () => {
    expect(effectiveReservationStatus('ready_pickup', null, null, BEFORE)).toBe('ready_pickup')
    expect(effectiveReservationStatus('ready_pickup', 'no-es-fecha', END, BEFORE)).toBe('ready_pickup')
  })
})

describe('isActiveOwnReservation (L-10)', () => {
  it('cuenta como "ya tienes este pack" todo estado vivo', () => {
    for (const st of ['payment_pending', 'confirmed', 'ready_pickup', 'picked_up']) {
      expect(isActiveOwnReservation(st)).toBe(true)
    }
  })

  it('canceladas, completadas y no-show NO cuentan', () => {
    for (const st of ['cancelled', 'completed', 'no_show', 'expired']) {
      expect(isActiveOwnReservation(st)).toBe(false)
    }
  })
})
