import { describe, it, expect } from 'vitest'
import { formatPrice } from '@/lib/utils/formatPrice'

describe('formatPrice', () => {
  it('formats cents to USD string', () => {
    expect(formatPrice(1000)).toBe('$10.00')
    expect(formatPrice(1500)).toBe('$15.00')
    expect(formatPrice(999)).toBe('$9.99')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('handles null and undefined', () => {
    expect(formatPrice(null)).toBe('$0.00')
    expect(formatPrice(undefined)).toBe('$0.00')
  })

  it('handles large amounts', () => {
    expect(formatPrice(100000)).toBe('$1,000.00')
    expect(formatPrice(1234567)).toBe('$12,345.67')
  })

  it('handles fractional cents', () => {
    expect(formatPrice(1001)).toBe('$10.01')
    expect(formatPrice(1050)).toBe('$10.50')
  })
})
