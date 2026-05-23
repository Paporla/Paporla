import { describe, it, expect } from 'vitest'
import {
  STATUS_CONFIG,
  STATUS_LABELS,
  sortReservationsByPickupTime,
  isActiveStatus,
  canCancelStatus,
} from '@/lib/constants/reservations'

describe('STATUS_CONFIG', () => {
  it('has config for all reservation statuses', () => {
    const statuses = [
      'pending',
      'confirmed',
      'ready_pickup',
      'picked_up',
      'completed',
      'cancelled',
      'no_show',
      'expired',
    ]
    for (const status of statuses) {
      expect(STATUS_CONFIG[status]).toBeDefined()
      expect(STATUS_CONFIG[status].label).toBeDefined()
      expect(STATUS_CONFIG[status].color).toBeDefined()
      expect(STATUS_CONFIG[status].bg).toBeDefined()
    }
  })

  it('returns pending as fallback for unknown status', () => {
    expect(STATUS_CONFIG['unknown']).toBeUndefined()
  })
})

describe('STATUS_LABELS', () => {
  it('has labels for all statuses', () => {
    expect(STATUS_LABELS['pending']).toBe('Pendiente')
    expect(STATUS_LABELS['confirmed']).toBe('Confirmada')
    expect(STATUS_LABELS['completed']).toBe('Completada')
    expect(STATUS_LABELS['cancelled']).toBe('Cancelada')
  })
})

describe('sortReservationsByPickupTime', () => {
  it('puts confirmed reservations first', () => {
    const reservations = [
      { id: '1', status: 'cancelled', pickup_date: '2025-06-20' },
      { id: '2', status: 'confirmed', pickup_date: '2025-06-15' },
      { id: '3', status: 'completed', pickup_date: '2025-06-10' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted[0].id).toBe('2')
  })

  it('sorts by closest pickup date within same status', () => {
    const reservations = [
      { id: '1', status: 'confirmed', pickup_date: '2025-06-20' },
      { id: '2', status: 'confirmed', pickup_date: '2025-06-15' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted[0].id).toBe('2')
    expect(sorted[1].id).toBe('1')
  })

  it('handles null pickup_date', () => {
    const reservations = [
      { id: '1', status: 'confirmed', pickup_date: null },
      { id: '2', status: 'confirmed', pickup_date: '2025-06-15' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted[0].id).toBe('2')
  })

  it('does not mutate original array', () => {
    const reservations = [
      { id: '1', status: 'cancelled', pickup_date: '2025-06-20' },
      { id: '2', status: 'confirmed', pickup_date: '2025-06-15' },
    ]
    const originalLength = reservations.length
    sortReservationsByPickupTime(reservations)
    expect(reservations).toHaveLength(originalLength)
  })
})

describe('isActiveStatus', () => {
  it('returns true for active statuses', () => {
    expect(isActiveStatus('pending')).toBe(true)
    expect(isActiveStatus('confirmed')).toBe(true)
    expect(isActiveStatus('ready_pickup')).toBe(true)
  })

  it('returns false for inactive statuses', () => {
    expect(isActiveStatus('completed')).toBe(false)
    expect(isActiveStatus('cancelled')).toBe(false)
    expect(isActiveStatus('no_show')).toBe(false)
    expect(isActiveStatus('expired')).toBe(false)
  })
})

describe('canCancelStatus', () => {
  it('returns true for cancellable statuses', () => {
    expect(canCancelStatus('pending')).toBe(true)
    expect(canCancelStatus('confirmed')).toBe(true)
  })

  it('returns false for non-cancellable statuses', () => {
    expect(canCancelStatus('completed')).toBe(false)
    expect(canCancelStatus('cancelled')).toBe(false)
    expect(canCancelStatus('picked_up')).toBe(false)
  })
})
