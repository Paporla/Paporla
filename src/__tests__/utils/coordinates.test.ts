import { describe, it, expect } from 'vitest'
import { parseCoordinate, validateCoordinatePair } from '@/lib/utils/coordinates'

describe('parseCoordinate', () => {
  it('convierte texto válido a número (con espacios a los lados)', () => {
    expect(parseCoordinate('-33.4489')).toBe(-33.4489)
    expect(parseCoordinate('  -70.6693 ')).toBe(-70.6693)
  })

  it('vacío devuelve null (coordenada ausente, no es un error)', () => {
    expect(parseCoordinate('')).toBeNull()
    expect(parseCoordinate('   ')).toBeNull()
  })

  it('texto no numérico devuelve null', () => {
    expect(parseCoordinate('abc')).toBeNull()
  })
})

describe('validateCoordinatePair', () => {
  it('acepta un par válido (Santiago)', () => {
    expect(validateCoordinatePair('-33.4489', '-70.6693')).toEqual({ ok: true, error: null })
  })

  it('acepta ambas vacías (el comercio aún no tiene ubicación)', () => {
    expect(validateCoordinatePair('', '')).toEqual({ ok: true, error: null })
    expect(validateCoordinatePair('   ', '')).toEqual({ ok: true, error: null })
  })

  it('acepta los bordes del rango (inclusive)', () => {
    expect(validateCoordinatePair('-90', '180').ok).toBe(true)
    expect(validateCoordinatePair('90', '-180').ok).toBe(true)
  })

  it('rechaza una coordenada vacía y la otra llena (van juntas)', () => {
    const soloLat = validateCoordinatePair('-33.4489', '')
    expect(soloLat.ok).toBe(false)
    expect(soloLat.error).toContain('van juntas')
    const soloLng = validateCoordinatePair('', '-70.6693')
    expect(soloLng.ok).toBe(false)
    expect(soloLng.error).toContain('van juntas')
  })

  it('rechaza texto no numérico, señalando qué campo es', () => {
    const lat = validateCoordinatePair('abc', '-70.6693')
    expect(lat.ok).toBe(false)
    expect(lat.error).toContain('latitud')
    const lng = validateCoordinatePair('-33.4489', 'calle')
    expect(lng.ok).toBe(false)
    expect(lng.error).toContain('longitud')
  })

  it('rechaza latitud fuera de rango', () => {
    expect(validateCoordinatePair('91', '0').ok).toBe(false)
    expect(validateCoordinatePair('-90.5', '0').ok).toBe(false)
    expect(validateCoordinatePair('999', '0').error).toContain('entre -90 y 90')
  })

  it('rechaza longitud fuera de rango', () => {
    expect(validateCoordinatePair('0', '181').ok).toBe(false)
    expect(validateCoordinatePair('0', '-200').error).toContain('entre -180 y 180')
  })
})
