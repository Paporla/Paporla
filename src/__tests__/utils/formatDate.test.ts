import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatRelativeDate, formatPickupWindow, dateKeyInTimezone } from '@/lib/utils/formatDate'

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

  it('returns singular "Hace 1 hora" when exactly one hour', () => {
    vi.setSystemTime(new Date('2024-06-15T15:00:00Z'))
    expect(formatRelativeDate('2024-06-15T14:00:00Z')).toBe('Hace 1 hora')
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

describe('formatPickupWindow', () => {
  // Fechas de julio (invierno chileno, UTC-4 en CUALQUIER versión de tzdb):
  // la prueba no depende de cuándo termina el horario de verano.
  it('muestra inicio y fin en la zona horaria del mercado', () => {
    const result = formatPickupWindow('2026-07-15T15:00:00-04:00', '2026-07-15T18:00:00-04:00', 'America/Santiago')
    expect(result).toContain('15')
    expect(result).toContain('15:00')
    expect(result).toContain('18:00')
  })

  it('solo muestra el inicio si no hay fin', () => {
    const result = formatPickupWindow('2026-07-15T15:00:00-04:00', null, 'America/Santiago')
    expect(result).toContain('15:00')
    expect(result).not.toContain('–')
  })

  it('resuelve un mismo instante UTC a la hora local correcta', () => {
    // 2026-07-15T18:00:00Z = 14:00 en Santiago (invierno: UTC-4)
    const result = formatPickupWindow('2026-07-15T18:00:00Z', null, 'America/Santiago')
    expect(result).toContain('14:00')
  })

  it('devuelve "Fecha por confirmar" sin inicio', () => {
    expect(formatPickupWindow(null, null)).toBe('Fecha por confirmar')
    expect(formatPickupWindow('no es una fecha', '2026-09-30T18:00:00Z')).toBe('Fecha por confirmar')
  })
})

describe('dateKeyInTimezone', () => {
  it('devuelve YYYY-MM-DD en la zona horaria del mercado, no en UTC', () => {
    // 2026-10-01T02:00:00Z es el 30 de septiembre 22:00 en Santiago
    expect(dateKeyInTimezone('2026-10-01T02:00:00Z', 'America/Santiago')).toBe('2026-09-30')
    // 2026-09-30T13:00:00Z es el 30 de septiembre 09:00 en Santiago
    expect(dateKeyInTimezone('2026-09-30T13:00:00Z', 'America/Santiago')).toBe('2026-09-30')
    // ...pero en UTC cae el 1 de octubre
    expect(dateKeyInTimezone('2026-10-01T02:00:00Z', 'UTC')).toBe('2026-10-01')
  })

  it('usa America/Santiago por defecto', () => {
    expect(dateKeyInTimezone('2026-10-01T02:00:00Z')).toBe('2026-09-30')
  })

  it('devuelve cadena vacía sin fecha o fecha inválida', () => {
    expect(dateKeyInTimezone(null)).toBe('')
    expect(dateKeyInTimezone('no es una fecha')).toBe('')
  })
})
