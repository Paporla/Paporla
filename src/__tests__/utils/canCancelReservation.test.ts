import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { canCancelReservation } from '@/lib/utils/canCancelReservation'

describe('canCancelReservation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows cancellation for pending reservations with enough time', () => {
    const result = canCancelReservation({
      status: 'pending',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(true)
  })

  it('allows cancellation for confirmed reservations with enough time', () => {
    const result = canCancelReservation({
      status: 'confirmed',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(true)
  })

  it('denies cancellation for picked_up reservations', () => {
    const result = canCancelReservation({
      status: 'picked_up',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('ya no puede ser cancelada')
  })

  it('denies cancellation for cancelled reservations', () => {
    const result = canCancelReservation({
      status: 'cancelled',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(false)
  })

  it('denies cancellation for no_show reservations', () => {
    const result = canCancelReservation({
      status: 'no_show',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(false)
  })

  it('denies cancellation when less than 2 hours remain', () => {
    vi.setSystemTime(new Date('2024-06-15T12:30:00Z'))
    const result = canCancelReservation({
      status: 'confirmed',
      pickup_date: '2024-06-15T10:00:00Z',
      pickup_start_time: '14:00',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('menos de 2 horas')
  })

  it('allows cancellation when no pickup date is set', () => {
    const result = canCancelReservation({
      status: 'pending',
      pickup_date: null,
      pickup_start_time: null,
    })
    expect(result.allowed).toBe(true)
  })

  it('uses end of day when no pickup_start_time is set', () => {
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
    const result = canCancelReservation({
      status: 'confirmed',
      pickup_date: '2024-06-16T10:00:00Z',
      pickup_start_time: null,
    })
    expect(result.allowed).toBe(true)
  })
})
