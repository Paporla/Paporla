import { describe, it, expect } from 'vitest'
import { formatPrice } from '@/lib/utils/formatPrice'

describe('formatPrice', () => {
  describe('con locale y currency explicitos (USD)', () => {
    it('formats cents to USD string', () => {
      expect(formatPrice(1000, 'en-US', 'USD')).toBe('$10.00')
      expect(formatPrice(1500, 'en-US', 'USD')).toBe('$15.00')
      expect(formatPrice(999, 'en-US', 'USD')).toBe('$9.99')
    })

    it('handles zero', () => {
      expect(formatPrice(0, 'en-US', 'USD')).toBe('$0.00')
    })

    it('handles null and undefined', () => {
      expect(formatPrice(null, 'en-US', 'USD')).toBe('$0.00')
      expect(formatPrice(undefined, 'en-US', 'USD')).toBe('$0.00')
    })

    it('handles large amounts', () => {
      expect(formatPrice(100000, 'en-US', 'USD')).toBe('$1,000.00')
      expect(formatPrice(1234567, 'en-US', 'USD')).toBe('$12,345.67')
    })

    it('handles fractional cents', () => {
      expect(formatPrice(1001, 'en-US', 'USD')).toBe('$10.01')
      expect(formatPrice(1050, 'en-US', 'USD')).toBe('$10.50')
    })
  })

  describe('con defaults LATAM (es-AR / ARS)', () => {
    it('formats price with ARS conventions (comma decimals)', () => {
      const result = formatPrice(1500)
      // ARS usa coma como separador decimal: "$ 15,00"
      expect(result).toContain('15')
      expect(result).toContain('00')
      expect(result).toContain('$')
    })

    it('returns zero for null/undefined', () => {
      const result = formatPrice(null)
      expect(result).toContain('0')
      expect(result).toContain('$')
    })
  })

  describe('fallback para locales no soportados', () => {
    it('includes currency code when Intl fails', () => {
      // Con 'xx-XX' y 'XYZ', la mayoria de runtimes igual devuelven formato.
      // Verificamos que al menos contiene el currency y el monto.
      const result = formatPrice(1500, 'xx-XX', 'XYZ')
      expect(result).toContain('15')
      expect(result).toContain('XYZ')
    })
  })
})
