import { describe, expect, it } from 'vitest'
import { FRANJAS, MICROCOPY, franjaActual, franjaDesdeHora, horaEnChile } from '@/lib/franja'

describe('franjaDesdeHora', () => {
  it('repartir el día en las tres franjas de la casa', () => {
    expect(franjaDesdeHora(4)).toBe('noche')
    expect(franjaDesdeHora(5)).toBe('manana')
    expect(franjaDesdeHora(12)).toBe('manana')
    expect(franjaDesdeHora(13)).toBe('tarde')
    expect(franjaDesdeHora(19)).toBe('tarde')
    expect(franjaDesdeHora(20)).toBe('noche')
    expect(franjaDesdeHora(0)).toBe('noche')
    expect(franjaDesdeHora(23)).toBe('noche')
  })
})

describe('horaEnChile', () => {
  it('lee el reloj de Chile y no el del dispositivo', () => {
    // Septiembre de 2026: Chile en horario de verano (UTC-3).
    expect(horaEnChile(new Date('2026-09-18T12:00:00Z'))).toBe(9)
    // Julio de 2026: horario de invierno (UTC-4).
    expect(horaEnChile(new Date('2026-07-15T12:00:00Z'))).toBe(8)
    // Madrugada chilena aunque en Europa sea mediodía.
    expect(horaEnChile(new Date('2026-09-19T06:30:00Z'))).toBe(3)
  })

  it('devuelve siempre una hora válida', () => {
    const h = horaEnChile(new Date())
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(23)
  })
})

describe('franjaActual', () => {
  it('convierte una fecha completa en su franja', () => {
    expect(franjaActual(new Date('2026-09-18T12:00:00Z'))).toBe('manana') // 9:00 CL
    expect(franjaActual(new Date('2026-09-18T22:00:00Z'))).toBe('tarde') // 19:00 CL
    expect(franjaActual(new Date('2026-09-19T06:30:00Z'))).toBe('noche') // 3:30 CL
  })
})

describe('textos de la casa', () => {
  it('cada franja tiene su chip y su tagline', () => {
    expect(FRANJAS.manana.tagline).toBe('Tu pack te espera esta mañana.')
    expect(FRANJAS.tarde.chip).toBe('Tarde')
    expect(FRANJAS.noche.tagline).toContain('noche')
  })

  it('el microcopy rotativo sigue siendo el acordado', () => {
    expect(MICROCOPY).toHaveLength(4)
    expect(MICROCOPY[0]).toBe('Cargando cercanía...')
  })
})
