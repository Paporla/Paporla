import { describe, it, expect } from 'vitest'
import { CO2E_KG_PER_PACK, co2eKgForPacks } from '@/lib/constants/impact'

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
