import { describe, it, expect, beforeEach } from 'vitest'
import { rememberPickupTimes, getRememberedPickupTimes } from '@/lib/utils/pickupMemory'

/**
 * Memoria del último horario de recogida (Lote D simplificación UX).
 *
 * Preferencia de UI en localStorage: se guarda al GUARDAR un pack y el
 * siguiente pack nuevo nace con esa ventana. Todo lo leído se revalida
 * (localStorage es territorio del usuario): solo entran HH:MM válidos con
 * inicio < fin.
 */
describe('pickupMemory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('sin memoria: devuelve null (el formulario nace como siempre)', () => {
    expect(getRememberedPickupTimes()).toBeNull()
  })

  it('guarda y recupera la última ventana usada', () => {
    rememberPickupTimes('19:00', '21:00')
    expect(getRememberedPickupTimes()).toEqual({
      pickup_start_time: '19:00',
      pickup_end_time: '21:00',
    })
  })

  it('no guarda ventanas inválidas (fin antes del inicio, horas mal formadas)', () => {
    rememberPickupTimes('21:00', '19:00')
    expect(getRememberedPickupTimes()).toBeNull()

    rememberPickupTimes('9am', '11am')
    expect(getRememberedPickupTimes()).toBeNull()

    rememberPickupTimes('', '')
    expect(getRememberedPickupTimes()).toBeNull()
  })

  it('rechaza contenido corrupto o manipulado en localStorage', () => {
    window.localStorage.setItem('paporla_last_pickup_times', 'no-es-json{')
    expect(getRememberedPickupTimes()).toBeNull()

    window.localStorage.setItem('paporla_last_pickup_times', JSON.stringify({ start: '25:99', end: '26:00' }))
    expect(getRememberedPickupTimes()).toBeNull()

    window.localStorage.setItem('paporla_last_pickup_times', JSON.stringify({ start: '<script>', end: '21:00' }))
    expect(getRememberedPickupTimes()).toBeNull()
  })

  it('la última escritura gana (el hábito más reciente es el que vale)', () => {
    rememberPickupTimes('12:00', '15:00')
    rememberPickupTimes('19:00', '21:00')
    expect(getRememberedPickupTimes()).toEqual({
      pickup_start_time: '19:00',
      pickup_end_time: '21:00',
    })
  })
})
