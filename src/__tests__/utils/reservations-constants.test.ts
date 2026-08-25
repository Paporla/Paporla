import { describe, it, expect } from 'vitest'
import {
  RESERVATION_STATUSES,
  STATUS_CONFIG,
  STATUS_LABELS,
  getStatusConfig,
  sortReservationsByPickupTime,
  isActiveStatus,
  canCancelStatus,
} from '@/lib/constants/reservations'

describe('RESERVATION_STATUSES', () => {
  it('es la lista exacta que valida la base de datos (0014:333)', () => {
    expect([...RESERVATION_STATUSES].sort()).toEqual([
      'cancelled',
      'completed',
      'confirmed',
      'expired',
      'no_show',
      'payment_pending',
      'picked_up',
      'ready_pickup',
    ])
  })

  it('no incluye el estado legacy "pending"', () => {
    expect(RESERVATION_STATUSES).not.toContain('pending')
  })
})

describe('STATUS_CONFIG', () => {
  it('tiene configuración completa para los 8 estados canónicos', () => {
    for (const status of RESERVATION_STATUSES) {
      const config = STATUS_CONFIG[status]
      expect(config).toBeDefined()
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.bg).toBeTruthy()
      expect(config.border).toBeTruthy()
    }
  })

  it('etiqueta payment_pending como "Aguardando confirmación"', () => {
    expect(STATUS_CONFIG['payment_pending'].label).toBe('Aguardando confirmación')
  })

  it('conserva el alias legacy "pending" para el lado business (fase 4)', () => {
    expect(STATUS_CONFIG['pending']).toBeDefined()
    expect(STATUS_CONFIG['pending'].label).toBe('Pendiente')
  })
})

describe('getStatusConfig', () => {
  it('devuelve la configuración del estado conocido', () => {
    expect(getStatusConfig('confirmed').label).toBe('Confirmada')
  })

  it('ante un estado desconocido muestra el valor crudo en gris, sin explotar', () => {
    const config = getStatusConfig('estado_del_futuro')
    expect(config.label).toBe('estado_del_futuro')
    expect(config.color).toContain('gray')
  })
})

describe('STATUS_LABELS', () => {
  it('sincroniza sus etiquetas con STATUS_CONFIG', () => {
    expect(STATUS_LABELS['payment_pending']).toBe('Aguardando confirmación')
    expect(STATUS_LABELS['confirmed']).toBe('Confirmada')
    expect(STATUS_LABELS['completed']).toBe('Completada')
    expect(STATUS_LABELS['cancelled']).toBe('Cancelada')
  })
})

describe('sortReservationsByPickupTime', () => {
  it('pone las activas antes que el historial, sin importar la fecha', () => {
    const reservations = [
      { id: '1', status: 'completed', pickup_start_at: '2025-06-10T18:00:00Z' },
      { id: '2', status: 'payment_pending', pickup_start_at: '2025-06-20T18:00:00Z' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted[0].id).toBe('2')
  })

  it('dentro de las activas, la recogida más cercana va primero', () => {
    const reservations = [
      { id: '1', status: 'confirmed', pickup_start_at: '2025-06-20T18:00:00Z' },
      { id: '2', status: 'payment_pending', pickup_start_at: '2025-06-15T18:00:00Z' },
      { id: '3', status: 'ready_pickup', pickup_start_at: '2025-06-18T18:00:00Z' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted.map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('las sin pickup_start_at van al final', () => {
    const reservations = [
      { id: '1', status: 'payment_pending', pickup_start_at: null },
      { id: '2', status: 'confirmed', pickup_start_at: '2025-06-15T18:00:00Z' },
    ]
    const sorted = sortReservationsByPickupTime(reservations)
    expect(sorted[0].id).toBe('2')
  })

  it('no muta el array original', () => {
    const reservations = [
      { id: '1', status: 'completed', pickup_start_at: '2025-06-20T18:00:00Z' },
      { id: '2', status: 'confirmed', pickup_start_at: '2025-06-15T18:00:00Z' },
    ]
    const ordenOriginal = reservations.map((r) => r.id)
    sortReservationsByPickupTime(reservations)
    expect(reservations.map((r) => r.id)).toEqual(ordenOriginal)
  })
})

describe('isActiveStatus', () => {
  it('activos: los mismos que cancel_reservation deja cancelar', () => {
    expect(isActiveStatus('payment_pending')).toBe(true)
    expect(isActiveStatus('confirmed')).toBe(true)
    expect(isActiveStatus('ready_pickup')).toBe(true)
  })

  it('inactivos: el historial y el legacy "pending"', () => {
    expect(isActiveStatus('picked_up')).toBe(false)
    expect(isActiveStatus('completed')).toBe(false)
    expect(isActiveStatus('cancelled')).toBe(false)
    expect(isActiveStatus('no_show')).toBe(false)
    expect(isActiveStatus('expired')).toBe(false)
    expect(isActiveStatus('pending')).toBe(false)
  })
})

describe('canCancelStatus', () => {
  it('coincide exactamente con la lista de cancel_reservation (0009:366)', () => {
    expect(canCancelStatus('payment_pending')).toBe(true)
    expect(canCancelStatus('confirmed')).toBe(true)
    expect(canCancelStatus('ready_pickup')).toBe(true)
    expect(canCancelStatus('picked_up')).toBe(false)
    expect(canCancelStatus('completed')).toBe(false)
    expect(canCancelStatus('cancelled')).toBe(false)
    expect(canCancelStatus('no_show')).toBe(false)
    expect(canCancelStatus('expired')).toBe(false)
  })
})
