import { describe, it, expect } from 'vitest'
import { normalizePickupCredential } from '@/lib/utils/pickupCode'

/**
 * Normalización indulgente del código de recogida (Lote B simplificación UX).
 *
 * Contexto real: el cliente dicta "P4P-A7K9X2M4" en voz alta con la tienda
 * llena y el comercio lo escribe como puede. Todas las variantes razonables
 * deben reconstruir la credencial canónica que espera validate_pickup
 * (sha256 exacto de 'P4P-' + 8 caracteres, 0031:82).
 */
describe('normalizePickupCredential', () => {
  it('acepta el código canónico tal cual', () => {
    expect(normalizePickupCredential('P4P-ABCD1234')).toBe('P4P-ABCD1234')
  })

  it('añade el prefijo P4P- cuando el comercio escribe solo el cuerpo', () => {
    expect(normalizePickupCredential('ABCD1234')).toBe('P4P-ABCD1234')
  })

  it('acepta minúsculas (dictado: nadie dice "en mayúsculas")', () => {
    expect(normalizePickupCredential('p4p-abcd1234')).toBe('P4P-ABCD1234')
    expect(normalizePickupCredential('abcd1234')).toBe('P4P-ABCD1234')
  })

  it('ignora espacios, guiones y puntos intermedios', () => {
    expect(normalizePickupCredential('abcd 1234')).toBe('P4P-ABCD1234')
    expect(normalizePickupCredential('p4p abcd-12.34')).toBe('P4P-ABCD1234')
    expect(normalizePickupCredential('  P4P - ABCD 1234  ')).toBe('P4P-ABCD1234')
  })

  it('acepta el prefijo pegado sin guion', () => {
    expect(normalizePickupCredential('P4PABCD1234')).toBe('P4P-ABCD1234')
  })

  it('corrige confusiones visuales seguras: O→0, I/L→1 (no existen en hex)', () => {
    // El código real emitido es hex: quien escribe O quiso decir 0.
    expect(normalizePickupCredential('ABCDO23I')).toBe('P4P-ABCD0231')
    expect(normalizePickupCredential('p4p-abcdl234')).toBe('P4P-ABCD1234')
  })

  it('rechaza entradas que no pueden ser un código', () => {
    expect(normalizePickupCredential('')).toBeNull()
    expect(normalizePickupCredential('ABC')).toBeNull() // corto
    expect(normalizePickupCredential('ABCD12345')).toBeNull() // largo
    expect(normalizePickupCredential('ABCD 12@4')).toBeNull() // símbolo raro
    expect(normalizePickupCredential('P4P-')).toBeNull() // solo prefijo
  })

  it('la credencial devuelta SIEMPRE tiene el formato canónico P4P-XXXXXXXX', () => {
    const out = normalizePickupCredential('a b c d 1 2 3 4')
    expect(out).toMatch(/^P4P-[0-9A-Z]{8}$/)
  })
})
