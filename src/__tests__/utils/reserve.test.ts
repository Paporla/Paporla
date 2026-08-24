import { describe, it, expect } from 'vitest'
import { getReserveBlockReason, formatPickupWindow } from '@/lib/utils/reserve'

describe('getReserveBlockReason', () => {
  const FUTURE_END = '2099-01-01T00:00:00Z'

  it('no bloquea con stock disponible y ventana futura', () => {
    expect(getReserveBlockReason({ remainingStock: 3, pickupEndAt: FUTURE_END })).toBeNull()
  })

  it('bloquea por agotado cuando el stock es 0', () => {
    expect(getReserveBlockReason({ remainingStock: 0, pickupEndAt: FUTURE_END })).toBe('sold-out')
  })

  it('bloquea por agotado con stock negativo (defensa ante datos raros)', () => {
    expect(getReserveBlockReason({ remainingStock: -1, pickupEndAt: FUTURE_END })).toBe('sold-out')
  })

  it('el agotado tiene prioridad sobre la ventana pasada', () => {
    const now = new Date('2026-08-24T12:00:00Z')
    expect(getReserveBlockReason({ remainingStock: 0, pickupEndAt: '2026-08-01T00:00:00Z', now })).toBe('sold-out')
  })

  it('bloquea cuando la ventana de recogida ya terminó', () => {
    const now = new Date('2026-08-24T12:00:00Z')
    expect(getReserveBlockReason({ remainingStock: 5, pickupEndAt: '2026-08-24T11:00:00Z', now })).toBe('window-passed')
  })

  it('no bloquea si la ventana termina en el futuro (aunque sea por poco)', () => {
    const now = new Date('2026-08-24T12:00:00Z')
    expect(getReserveBlockReason({ remainingStock: 5, pickupEndAt: '2026-08-24T12:00:01Z', now })).toBeNull()
  })

  it('no bloquea con pickupEndAt null: la RPC es la que decide', () => {
    expect(getReserveBlockReason({ remainingStock: 2, pickupEndAt: null })).toBeNull()
  })

  it('no bloquea con fecha inválida: la RPC es la que decide', () => {
    expect(getReserveBlockReason({ remainingStock: 2, pickupEndAt: 'no-es-una-fecha' })).toBeNull()
  })
})

describe('formatPickupWindow', () => {
  // Viernes 4 de septiembre de 2026, 19:00 hora de Santiago (UTC-4).
  const START_FRI = '2026-09-04T19:00:00-04:00'
  const END_FRI = '2026-09-04T23:00:00-04:00'
  const END_SAT = '2026-09-05T01:00:00-04:00'

  it('ventana del mismo día incluye el día y ambas horas', () => {
    const label = formatPickupWindow(START_FRI, END_FRI, 'America/Santiago')
    expect(label).toContain('viernes')
    expect(label).toContain('7:00 p. m.')
    expect(label).toContain('11:00 p. m.')
  })

  it('ventana que cruza de día muestra las dos fechas', () => {
    const label = formatPickupWindow(START_FRI, END_SAT, 'America/Santiago')
    expect(label).toContain('viernes')
    expect(label).toContain('sábado')
  })

  it('solo inicio: etiqueta única con hora', () => {
    const label = formatPickupWindow(START_FRI, null, 'America/Santiago')
    expect(label).toContain('viernes')
    expect(label).toContain('7:00 p. m.')
  })

  it('sin datos válidos devuelve null', () => {
    expect(formatPickupWindow(null, null, 'America/Santiago')).toBeNull()
    expect(formatPickupWindow('x', 'y', 'America/Santiago')).toBeNull()
  })

  it('zona horaria inválida devuelve null (mejor sin etiqueta que una hora mentirosa)', () => {
    expect(formatPickupWindow(START_FRI, END_FRI, 'Marte/Olympus')).toBeNull()
  })

  it('timezone vacía cae a America/Santiago', () => {
    const label = formatPickupWindow(START_FRI, END_FRI, '')
    expect(label).toContain('7:00 p. m.')
  })
})
