import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatRelativeDate,
  formatPickupWindow,
  dateKeyInTimezone,
  marketDayKeysBack,
} from '@/lib/utils/formatDate'

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

/**
 * Barrida de zonas horarias (2026-09-16).
 *
 * El panel de admin construía la serie de "últimos 30 días" así:
 *
 *     const d = new Date()
 *     d.setDate(d.getDate() - i)          // hora LOCAL del navegador
 *     return d.toISOString().split('T')[0] // ...y luego se lee en UTC
 *
 * Mezclar las dos zonas corría TODA la serie un día: en Chile (UTC-3/-4), pasar
 * de la tarde a UTC caía casi siempre en el día siguiente. El gráfico agrupaba
 * los registros en la columna equivocada, y el error cambiaba según DESDE DÓNDE
 * se abriera el panel: en un navegador en UTC salía bien y en uno chileno no.
 *
 * Estas pruebas fijan que la serie se ancla en la fecha del MERCADO.
 */
describe('marketDayKeysBack', () => {
  it('devuelve la serie en orden cronológico y terminando hoy', () => {
    // Mediodía UTC del 30-sep: en Chile también es 30 (09:00, UTC-3 en verano).
    const keys = marketDayKeysBack(5, new Date('2026-09-30T12:00:00Z'))
    expect(keys).toEqual(['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'])
  })

  it('NO se corre un día cuando Chile va por detrás de UTC (el bug del admin)', () => {
    // 01:00 UTC del 16-sep-2026 = 22:00 del 15-sep en Chile (verano, UTC-3).
    // Aquí las dos zonas están en DÍAS DISTINTOS. El código antiguo devolvía
    // ...14, 15, 16 (la lectura en UTC); el correcto termina el 15, que es el
    // día que es "hoy" en Chile.
    const keys = marketDayKeysBack(3, new Date('2026-09-16T01:00:00Z'))

    expect(keys).toEqual(['2026-09-13', '2026-09-14', '2026-09-15'])
    expect(keys.at(-1)).not.toBe('2026-09-16') // lo que daba el código viejo
  })

  it('la longitud es exacta y no hay huecos ni días repetidos', () => {
    const keys = marketDayKeysBack(30, new Date('2026-09-16T01:00:00Z'))
    expect(keys).toHaveLength(30)
    expect(new Set(keys).size).toBe(30)

    // Cada par consecutivo se lleva exactamente un día de calendario.
    for (let i = 1; i < keys.length; i++) {
      const diff =
        (new Date(`${keys[i]}T00:00:00Z`).getTime() - new Date(`${keys[i - 1]}T00:00:00Z`).getTime()) / 86400000
      expect(diff).toBe(1)
    }
  })

  it('atraviesa el cambio de hora de verano sin saltos', () => {
    // En Chile el horario de verano arranca el primer domingo de septiembre
    // (2026-09-06): ese día tiene 23 horas. La aritmética sobre medianoche UTC
    // lo atraviesa igual, sin duplicar ni perder ningún día.
    const keys = marketDayKeysBack(10, new Date('2026-09-10T12:00:00Z'))

    expect(keys).toHaveLength(10)
    expect(new Set(keys).size).toBe(10)
    expect(keys[0]).toBe('2026-09-01')
    expect(keys.at(-1)).toBe('2026-09-10')
    expect(keys).toContain('2026-09-06') // el día del cambio sigue estando
  })
})
