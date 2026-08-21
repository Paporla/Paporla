import { describe, it, expect } from 'vitest'
import { DAY_LABELS, displayIndexToWeekday, weekdayToDisplayIndex, weekdayToLabel } from '@/lib/constants/hours'
import {
  buildShopHourPayloads,
  createDefaultHours,
  hoursRowsToFormState,
  validateHours,
  type HoursData,
} from '@/lib/utils/shopHours'

const SHOP = '3d65619c-8e59-4cc0-97d5-0ad4d7a12c0e'

describe('conversión de días', () => {
  it('mapea el domingo al weekday 0 (regresión del bug: enviaba 7)', () => {
    const domingo = DAY_LABELS.indexOf('Domingo')
    expect(domingo).toBe(6)
    expect(displayIndexToWeekday(domingo)).toBe(0)
  })

  it('mapea el lunes al weekday 1', () => {
    expect(displayIndexToWeekday(DAY_LABELS.indexOf('Lunes'))).toBe(1)
  })

  it('mapea el sábado al weekday 6', () => {
    expect(displayIndexToWeekday(DAY_LABELS.indexOf('Sábado'))).toBe(6)
  })

  it('produce 7 weekdays únicos dentro del rango 0..6 del CHECK', () => {
    const weekdays = DAY_LABELS.map((_, i) => displayIndexToWeekday(i))
    expect(new Set(weekdays).size).toBe(7)
    for (const w of weekdays) {
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(6)
    }
  })

  it('ida y vuelta es la identidad en ambos sentidos', () => {
    for (let i = 0; i < 7; i++) {
      expect(weekdayToDisplayIndex(displayIndexToWeekday(i))).toBe(i)
      expect(displayIndexToWeekday(weekdayToDisplayIndex(i))).toBe(i)
    }
  })

  it('coincide con Date.getDay() para fechas conocidas', () => {
    // 2026-08-23 es domingo; 2026-08-24 es lunes.
    const domingo = new Date('2026-08-23T12:00:00Z').getUTCDay()
    const lunes = new Date('2026-08-24T12:00:00Z').getUTCDay()
    expect(domingo).toBe(0)
    expect(lunes).toBe(1)
    expect(weekdayToLabel(domingo)).toBe('Domingo')
    expect(weekdayToLabel(lunes)).toBe('Lunes')
  })

  it('rechaza weekdays fuera de rango', () => {
    expect(weekdayToLabel(7)).toBeNull()
    expect(weekdayToLabel(-1)).toBeNull()
    expect(weekdayToLabel(1.5)).toBeNull()
  })
})

describe('buildShopHourPayloads', () => {
  it('genera exactamente 7 payloads con sequence 1', () => {
    const payloads = buildShopHourPayloads(SHOP, createDefaultHours())
    expect(payloads).toHaveLength(7)
    for (const p of payloads) {
      expect(p.p_sequence).toBe(1)
      expect(p.p_shop_id).toBe(SHOP)
    }
  })

  it('envía NULL en las horas de un día cerrado (regresión: enviaba 00:00)', () => {
    const payloads = buildShopHourPayloads(SHOP, createDefaultHours())
    const domingo = payloads.find((p) => p.p_weekday === 0)
    expect(domingo).toBeDefined()
    expect(domingo!.p_is_closed).toBe(true)
    expect(domingo!.p_opens_at).toBeNull()
    expect(domingo!.p_closes_at).toBeNull()
  })

  it('envía ambas horas en un día abierto', () => {
    const payloads = buildShopHourPayloads(SHOP, createDefaultHours())
    const lunes = payloads.find((p) => p.p_weekday === 1)!
    expect(lunes.p_is_closed).toBe(false)
    expect(lunes.p_opens_at).toBe('09:00')
    expect(lunes.p_closes_at).toBe('18:00')
  })

  it('cada payload respeta el CHECK de shop_hours', () => {
    const hours: HoursData = {
      ...createDefaultHours(),
      Miércoles: { open: '10:00', close: '14:00', closed: false },
      Sábado: { open: '00:00', close: '00:00', closed: true },
    }

    for (const p of buildShopHourPayloads(SHOP, hours)) {
      expect(p.p_weekday).toBeGreaterThanOrEqual(0)
      expect(p.p_weekday).toBeLessThanOrEqual(6)
      expect(p.p_sequence).toBeGreaterThanOrEqual(1)
      expect(p.p_sequence).toBeLessThanOrEqual(3)

      if (p.p_is_closed) {
        expect(p.p_opens_at).toBeNull()
        expect(p.p_closes_at).toBeNull()
      } else {
        expect(p.p_opens_at).not.toBeNull()
        expect(p.p_closes_at).not.toBeNull()
        expect(p.p_closes_at! > p.p_opens_at!).toBe(true)
      }
    }
  })
})

describe('hoursRowsToFormState', () => {
  it('devuelve los valores por defecto si no hay filas', () => {
    expect(hoursRowsToFormState([])).toEqual(createDefaultHours())
    expect(hoursRowsToFormState(null)).toEqual(createDefaultHours())
  })

  it('coloca cada fila en su día y recorta los segundos', () => {
    const state = hoursRowsToFormState([
      { weekday: 1, opens_at: '08:00:00', closes_at: '20:00:00', is_closed: false },
      { weekday: 0, opens_at: null, closes_at: null, is_closed: true },
    ])
    expect(state.Lunes).toEqual({ open: '08:00', close: '20:00', closed: false })
    expect(state.Domingo.closed).toBe(true)
  })

  it('sobrevive a un ciclo completo lectura → escritura sin desplazar días', () => {
    const original: HoursData = {
      Lunes: { open: '08:00', close: '20:00', closed: false },
      Martes: { open: '08:00', close: '20:00', closed: false },
      Miércoles: { open: '10:00', close: '14:00', closed: false },
      Jueves: { open: '08:00', close: '20:00', closed: false },
      Viernes: { open: '08:00', close: '22:00', closed: false },
      Sábado: { open: '10:00', close: '15:00', closed: false },
      Domingo: { open: '09:00', close: '18:00', closed: true },
    }

    const rows = buildShopHourPayloads(SHOP, original).map((p) => ({
      weekday: p.p_weekday,
      opens_at: p.p_opens_at,
      closes_at: p.p_closes_at,
      is_closed: p.p_is_closed,
    }))

    const roundTrip = hoursRowsToFormState(rows)

    // El día cerrado pierde sus horas al pasar por la base de datos (NULL) y
    // vuelve con los valores por defecto: eso es correcto y esperado.
    expect(roundTrip.Domingo.closed).toBe(true)
    for (const day of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const) {
      expect(roundTrip[day]).toEqual(original[day])
    }
  })
})

describe('validateHours', () => {
  it('acepta el estado por defecto', () => {
    expect(validateHours(createDefaultHours())).toEqual([])
  })

  it('rechaza cierre anterior o igual a la apertura (CHECK estricto)', () => {
    const iguales = { ...createDefaultHours(), Lunes: { open: '10:00', close: '10:00', closed: false } }
    expect(validateHours(iguales)).toHaveLength(1)

    const invertidas = { ...createDefaultHours(), Lunes: { open: '20:00', close: '08:00', closed: false } }
    expect(validateHours(invertidas)).toHaveLength(1)
  })

  it('ignora los días cerrados aunque sus horas sean incoherentes', () => {
    const hours = { ...createDefaultHours(), Lunes: { open: '20:00', close: '08:00', closed: true } }
    expect(validateHours(hours)).toEqual([])
  })
})
