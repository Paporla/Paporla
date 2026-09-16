import { describe, it, expect } from 'vitest'
import {
  CO2E_KG_PER_PACK,
  co2eKgForPacks,
  computeMoneySaved,
  savingsMinorFor,
  type SavingsReservation,
} from '@/lib/constants/impact'

/**
 * A-23 (auditoría externa): la app daba DOS cifras distintas de CO₂ evitado
 * al mismo tiempo — 1,2 kg/pack en el panel del usuario y 2,5 kg/pack en la
 * portada. Cuando una app se contradice, al menos una de las dos miente.
 *
 * Estos tests no defienden el VALOR de la cifra (eso es una decisión de
 * producto y puede cambiar): defienden que exista UNA SOLA. Si alguien vuelve
 * a escribir `packs * 1.2` en cualquier pantalla, el test de abajo no lo podrá
 * evitar, pero este archivo documenta dónde vive la verdad.
 */
describe('impacto: CO2 evitado por pack', () => {
  it('la constante es un número positivo y finito', () => {
    expect(Number.isFinite(CO2E_KG_PER_PACK)).toBe(true)
    expect(CO2E_KG_PER_PACK).toBeGreaterThan(0)
  })

  it('calcula los kilos a partir de los packs', () => {
    expect(co2eKgForPacks(1)).toBe(Math.round(CO2E_KG_PER_PACK))
    expect(co2eKgForPacks(10)).toBe(Math.round(10 * CO2E_KG_PER_PACK))
    expect(co2eKgForPacks(100)).toBe(Math.round(100 * CO2E_KG_PER_PACK))
  })

  it('devuelve un entero (los kilos se muestran sin decimales)', () => {
    const value = co2eKgForPacks(7)
    expect(Number.isInteger(value)).toBe(true)
  })

  it('nunca devuelve negativos: cero packs es cero kilos', () => {
    expect(co2eKgForPacks(0)).toBe(0)
  })

  it('sobrevive a entradas imposibles sin pintar "NaN kg"', () => {
    expect(co2eKgForPacks(-5)).toBe(0)
    expect(co2eKgForPacks(Number.NaN)).toBe(0)
    expect(co2eKgForPacks(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

/**
 * A-05 (auditoría externa): la tarjeta "Ahorrado" del panel del usuario sumaba
 * `total_amount_minor`, que es el PRECIO DEL PACK. Es decir: llamaba "ahorro"
 * al gasto. Una cifra que no era lo que decía ser.
 *
 * Además la app se contradecía: la landing (community_stats, 0035) calculaba
 * el ahorro como `GREATEST(original − pagado, 0) × unidades` y el panel hacía
 * otra cuenta. Dos definiciones a la vez: al menos una mentía. Igual que pasó
 * con el CO₂ (A-23).
 *
 * Estos tests fijan la regla: el ahorro es (precio original − pagado) ×
 * unidades, nunca negativo, y si falta el dato NO se inventa la cifra.
 */

/** Reserva de prueba. Por defecto: pack de $5.990 vendido a $2.990, 2 unidades. */
function reserva(overrides: Partial<SavingsReservation> = {}): SavingsReservation {
  return {
    total_amount_minor: 5980,
    unit_price_minor: 2990,
    quantity: 2,
    original_price_minor: 5990,
    ...overrides,
  }
}

describe('ahorro: una sola definición (A-05)', () => {
  it('el ahorro es (precio original - pagado) x unidades', () => {
    // (5.990 - 2.990) * 2 = 6.000
    expect(savingsMinorFor(reserva())).toBe(6000)
  })

  it('NO es el precio del pack, que es lo que hacía antes', () => {
    const r = reserva()
    // El bug: sumar total_amount_minor daba 5.980. El ahorro real son 6.000.
    expect(savingsMinorFor(r)).not.toBe(r.total_amount_minor)
    expect(savingsMinorFor(r)).not.toBe(2990 * 2) // lo pagado: 2 x $2.990
  })

  it('nunca es negativo: sin precio original, ahorro 0', () => {
    expect(savingsMinorFor(reserva({ original_price_minor: null }))).toBe(0)
  })

  it('nunca es negativo: si se pagó más que el precio original, 0', () => {
    expect(savingsMinorFor(reserva({ unit_price_minor: 9000, original_price_minor: 5990 }))).toBe(0)
  })

  it('datos corruptos no producen números raros', () => {
    expect(savingsMinorFor(reserva({ quantity: Number.NaN }))).toBe(0)
    expect(savingsMinorFor(reserva({ quantity: -3 }))).toBe(0)
    expect(savingsMinorFor(reserva({ unit_price_minor: Number.NaN }))).toBe(0)
  })
})

describe('computeMoneySaved: degradación sin la migración 0050', () => {
  it('con el dato, devuelve el ahorro real y lo marca como disponible', () => {
    const r = computeMoneySaved([reserva(), reserva({ quantity: 1 })])
    expect(r.available).toBe(true)
    expect(r.savingsMinor).toBe(6000 + 3000) // 6.000 + 3.000
    expect(r.paidMinor).toBe(5980 * 2) // lo cobrado, aparte
  })

  it('SIN el precio original, NO inventa la cifra: available false', () => {
    // Así llegan las reservas si la migración 0050 no está aplicada.
    const r = computeMoneySaved([reserva({ original_price_minor: undefined })])
    expect(r.available).toBe(false)
    expect(r.savingsMinor).toBe(0)
    // ...pero el importe pagado sí lo sabe, para la etiqueta de reserva.
    expect(r.paidMinor).toBe(5980)
  })

  it('sin reservas, 0 es una cifra cierta', () => {
    const r = computeMoneySaved([])
    expect(r.available).toBe(true)
    expect(r.savingsMinor).toBe(0)
    expect(r.paidMinor).toBe(0)
  })

  it('si UNA reserva trae el dato, cuenta; las que no, aportan 0', () => {
    const r = computeMoneySaved([
      reserva({ original_price_minor: null }), // pack sin precio original declarado
      reserva(), // esta sí
    ])
    expect(r.available).toBe(true)
    expect(r.savingsMinor).toBe(0 + 6000)
  })
})
