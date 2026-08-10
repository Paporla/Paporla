import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatRelativeDate } from '@/lib/utils/formatDate'

describe('formatDate', () => {
  it('returns "Fecha no disponible" for null', () => {
    expect(formatDate(null)).toBe('Fecha no disponible')
  })

  it('formats a valid date string in Spanish locale', () => {
    const result = formatDate('2024-06-15T14:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('handles empty string', () => {
    expect(formatDate('')).toBe('Fecha no disponible')
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Hace menos de 1 hora" for recent dates', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    expect(formatRelativeDate('2024-06-15T11:30:00Z')).toBe('Hace menos de 1 hora')
  })

  it('returns hours ago for same-day dates', () => {
    vi.setSystemTime(new Date('2024-06-15T18:00:00Z'))
    expect(formatRelativeDate('2024-06-15T14:00:00Z')).toBe('Hace 4 horas')
  })

  it('returns "Ayer" for yesterday', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    expect(formatRelativeDate('2024-06-14T10:00:00Z')).toBe('Ayer')
  })

  it('returns formatted date for older dates', () => {
    vi.setSystemTime(new Date('2024-06-20T12:00:00Z'))
    const result = formatRelativeDate('2024-06-15T14:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})
