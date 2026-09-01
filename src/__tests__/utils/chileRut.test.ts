import { describe, it, expect } from 'vitest'
import { normalizeChileRut, isValidChileRut, getChileRutError } from '@/lib/utils/chileRut'

/**
 * RUTs de prueba con dígito verificador REAL (módulo 11):
 *   76543210 → suma 2·0+3·1+4·2+5·3+6·4+7·5+2·6+3·7 = 118, 118%11=8, 11-8=3…
 * Los casos de abajo están verificados con el algoritmo oficial.
 */
describe('normalizeChileRut', () => {
  it('acepta un RUT válido con puntos y guion y lo normaliza', () => {
    // 12.345.678-5: DV real de 12345678 es 5.
    expect(normalizeChileRut('12.345.678-5')).toBe('12345678-5')
  })

  it('acepta el RUT sin puntos ni guion', () => {
    expect(normalizeChileRut('123456785')).toBe('12345678-5')
  })

  it('acepta K minúscula y la normaliza a mayúscula', () => {
    // 20.347.878-k: DV real de 20347878 es K.
    expect(normalizeChileRut('20.347.878-k')).toBe('20347878-K')
  })

  it('rechaza un dígito verificador incorrecto', () => {
    expect(normalizeChileRut('12345678-9')).toBeNull()
  })

  it('rechaza formatos imposibles', () => {
    expect(normalizeChileRut('abc')).toBeNull()
    expect(normalizeChileRut('123')).toBeNull()
    expect(normalizeChileRut('123456789012-3')).toBeNull()
    expect(normalizeChileRut('')).toBeNull()
  })

  it('acepta RUT de 7 dígitos (empresas antiguas y personas)', () => {
    // 1234567: DV real es 4.
    expect(normalizeChileRut('1.234.567-4')).toBe('1234567-4')
  })
})

describe('isValidChileRut', () => {
  it('true para válido, false para inválido', () => {
    expect(isValidChileRut('12345678-5')).toBe(true)
    expect(isValidChileRut('12345678-0')).toBe(false)
  })
})

describe('getChileRutError', () => {
  it('el vacío no es error de formato (la obligatoriedad va aparte)', () => {
    expect(getChileRutError('')).toBeNull()
    expect(getChileRutError('   ')).toBeNull()
  })

  it('null para un RUT válido', () => {
    expect(getChileRutError('12.345.678-5')).toBeNull()
  })

  it('mensaje claro para un RUT inválido', () => {
    expect(getChileRutError('12345678-9')).toContain('RUT inválido')
  })
})
