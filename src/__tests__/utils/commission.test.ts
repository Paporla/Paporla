import { describe, it, expect } from 'vitest'
import { computeCommissionSplit, PROVISIONAL_COMMISSION_BPS } from '@/lib/utils/commission'

describe('computeCommissionSplit — la verdad del dinero (L-11)', () => {
  it('comisión provisional = 10%, como las stats de admin (0032/0033)', () => {
    expect(PROVISIONAL_COMMISSION_BPS).toBe(1000)
    const split = computeCommissionSplit(3990)
    expect(split).toEqual({ grossMinor: 3990, commissionMinor: 399, netMinor: 3591 })
  })

  it('cero es cero en las tres patas', () => {
    expect(computeCommissionSplit(0)).toEqual({ grossMinor: 0, commissionMinor: 0, netMinor: 0 })
  })

  it('la comisión se redondea hacia ABAJO: nunca se le cobra de más al comercio', () => {
    // 999 * 10% = 99.9 -> 99 (no 100)
    const split = computeCommissionSplit(999)
    expect(split.commissionMinor).toBe(99)
    expect(split.netMinor).toBe(900)
  })

  it('invariante sagrado: comisión + neto === bruto, para cualquier monto', () => {
    for (const gross of [1, 7, 99, 100, 999, 3990, 12345, 999999, 100000001]) {
      const s = computeCommissionSplit(gross)
      expect(s.commissionMinor + s.netMinor).toBe(s.grossMinor)
    }
  })

  it('entradas raras se sanean a cero (NaN, negativos, infinitos)', () => {
    for (const raro of [Number.NaN, -500, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(computeCommissionSplit(raro)).toEqual({ grossMinor: 0, commissionMinor: 0, netMinor: 0 })
    }
  })

  it('decimales fantasma se recortan: el monto menor es entero', () => {
    const split = computeCommissionSplit(3990.7)
    expect(split.grossMinor).toBe(3990)
    expect(split.commissionMinor + split.netMinor).toBe(3990)
  })

  it('acepta un porcentaje distinto (el día que la comisión sea configuración)', () => {
    const split = computeCommissionSplit(10000, 500) // 5%
    expect(split.commissionMinor).toBe(500)
    expect(split.netMinor).toBe(9500)
  })

  it('bps fuera de rango cae al provisional (defensa contra typos de config)', () => {
    expect(computeCommissionSplit(1000, -1).commissionMinor).toBe(100)
    expect(computeCommissionSplit(1000, 999999).commissionMinor).toBe(100)
  })
})
