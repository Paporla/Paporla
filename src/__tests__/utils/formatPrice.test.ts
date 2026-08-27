import { describe, it, expect } from 'vitest'
import { formatChilePesos, formatMinorPrice, formatPrice } from '@/lib/utils/formatPrice'

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

  describe('importes canónicos por moneda', () => {
    it('formatea CLP sin dividir por 100', () => {
      const result = formatMinorPrice(4990, 'CLP', 'es-CL')
      expect(result).toContain('4.990')
      expect(result).not.toContain(',00')
    })

    it('formatea monedas con dos decimales desde unidades menores', () => {
      const result = formatMinorPrice(12345, 'USD', 'en-US')
      expect(result).toBe('$123.45')
    })

    it('acepta null y undefined', () => {
      expect(formatMinorPrice(null, 'CLP', 'es-CL')).toContain('0')
      expect(formatMinorPrice(undefined, 'CLP', 'es-CL')).toContain('0')
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

  describe('formatChilePesos (determinista, piloto CLP)', () => {
    // Este formateo existe porque toLocaleString() sin locale varía por
    // máquina (5,490 / 5.490 / 5 490): los tests de página asientan el
    // string EXACTO gracias a que aquí no depende de la ICU.
    it('pinta pesos chilenos con separador de punto, sin decimales', () => {
      expect(formatChilePesos(3990)).toBe('$3.990')
      expect(formatChilePesos(5490)).toBe('$5.490')
      expect(formatChilePesos(1234567)).toBe('$1.234.567')
    })

    it('cero, null y undefined pintan $0 (estado vacío honesto)', () => {
      expect(formatChilePesos(0)).toBe('$0')
      expect(formatChilePesos(null)).toBe('$0')
      expect(formatChilePesos(undefined)).toBe('$0')
    })

    it('redondea y maneja negativos', () => {
      expect(formatChilePesos(1234.6)).toBe('$1.235')
      expect(formatChilePesos(-2500)).toBe('-$2.500')
    })
  })
})
