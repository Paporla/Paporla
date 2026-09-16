import {
  effectiveReservationStatus,
  effectiveReservationStatusForCustomer,
  isActiveOwnReservation,
} from '@/lib/utils/reservationDisplay'
import { getStatusConfig, STATUS_LABELS, RESERVATION_STATUSES } from '@/lib/constants/reservations'

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

describe('effectiveReservationStatusForCustomer (A-06)', () => {
  /**
   * El bug: con la ventana ya cerrada y el cron de no_show sin correr, la
   * tarjeta del cliente seguía diciendo "Lista para recoger" para siempre.
   * Aquí se cierra el hueco sin esperar al reloj automático.
   */
  it('ready_pickup con la ventana YA CERRADA deja de decir "Lista para recoger" (el bug A-06)', () => {
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, END, AFTER)).toBe('window_closed')
  })

  it('confirmed con la ventana YA CERRADA también avisa', () => {
    expect(effectiveReservationStatusForCustomer('confirmed', START, END, AFTER)).toBe('window_closed')
  })

  it('con la ventana ABIERTA sigue diciendo Lista para recoger', () => {
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, END, INSIDE)).toBe('ready_pickup')
    expect(effectiveReservationStatusForCustomer('confirmed', START, END, INSIDE)).toBe('ready_pickup')
  })

  it('con la ventana aún CERRADA por delante sigue diciendo Confirmada', () => {
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, END, BEFORE)).toBe('confirmed')
  })

  it('justo en el instante del cierre la ventana sigue abierta (el último minuto cuenta)', () => {
    const justAtEnd = new Date(END).getTime()
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, END, justAtEnd)).toBe('ready_pickup')
  })

  it('un segundo DESPUÉS del cierre ya avisa', () => {
    const oneSecondAfter = new Date(END).getTime() + 1000
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, END, oneSecondAfter)).toBe('window_closed')
  })

  it('otros estados no se tocan: si la base ya decidió, manda la base', () => {
    for (const st of ['payment_pending', 'picked_up', 'completed', 'cancelled', 'no_show', 'expired']) {
      expect(effectiveReservationStatusForCustomer(st, START, END, AFTER)).toBe(st)
    }
  })

  it('sin fecha de cierre: nunca inventa una ventana que no llegó', () => {
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, null, AFTER)).toBe('ready_pickup')
    expect(effectiveReservationStatusForCustomer('ready_pickup', START, 'no-es-fecha', AFTER)).toBe('ready_pickup')
  })

  /**
   * Blindaje: la del comercio alimenta FILTROS y el validador de códigos. Si
   * alguien "unifica" las dos funciones, un cliente que llegó tarde deja de
   * aparecerle al comercio bajo "Listas para recoger" y pierde su pack.
   */
  it('la del comercio NO cambia: tras el cierre sigue devolviendo el estado crudo', () => {
    expect(effectiveReservationStatus('ready_pickup', START, END, AFTER)).toBe('ready_pickup')
    expect(effectiveReservationStatus('confirmed', START, END, AFTER)).toBe('confirmed')
  })
})

describe('la etiqueta "Ventana cerrada" (A-06)', () => {
  it('existe en la tabla canónica y no afirma retiro ni cancelación', () => {
    expect(getStatusConfig('window_closed').label).toBe('Ventana cerrada')
    expect(STATUS_LABELS['window_closed']).toBe('Ventana cerrada')
  })

  it('no se cuela en la lista de estados que valida la base', () => {
    expect(RESERVATION_STATUSES).not.toContain('window_closed')
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
