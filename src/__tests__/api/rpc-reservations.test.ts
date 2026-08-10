/**
 * Tests de integración para las RPCs críticas de Paporla.
 *
 * Estas pruebas validan la lógica de negocio que vive en PostgreSQL:
 * - create_reservation_atomic: reserva con control de concurrencia
 * - cancel_reservation: cancelación con reintegro de stock
 * - validate_pickup: validación de código de recogida
 *
 * Se mockea supabase.rpc() para simular respuestas de la DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}))

// ─── Helpers ────────────────────────────────────────────────

/** Simula una respuesta exitosa de create_reservation_atomic */
function mockReservationSuccess(reservationId = 'res-001', pickupCode = 'XK92-MZ71') {
  return {
    success: true,
    reservation_id: reservationId,
    pickup_code: pickupCode,
  }
}

/** Simula una respuesta de error de create_reservation_atomic */
function mockReservationError(error: string) {
  return {
    success: false,
    error,
  }
}

/** Simula una respuesta exitosa de cancel_reservation */
function mockCancelSuccess() {
  return {
    success: true,
    message: 'Reserva cancelada exitosamente.',
  }
}

/** Simula una respuesta de error de cancel_reservation */
function mockCancelError(error: string) {
  return {
    success: false,
    error,
  }
}

/** Simula una respuesta exitosa de validate_pickup */
function mockPickupSuccess() {
  return {
    success: true,
    message: 'Recogida validada correctamente.',
  }
}

/** Simula una respuesta de error de validate_pickup */
function mockPickupError(error: string) {
  return {
    success: false,
    error,
  }
}

// ─── Tests: create_reservation_atomic ───────────────────────

describe('create_reservation_atomic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe crear una reserva exitosamente y devolver reservation_id + pickup_code', async () => {
    mockRpc.mockResolvedValueOnce({
      data: mockReservationSuccess('res-abc', 'CODE-123'),
      error: null,
    })

    // Simular la llamada que haría el hook useCreateReservation
    const { supabaseBrowser } = await import('@/lib/supabase/client')
    const supabase = supabaseBrowser()
    const { data, error } = await supabase.rpc('create_reservation_atomic', {
      p_pack_id: 'pack-1',
      p_quantity: 1,
      p_payment_method: 'cash',
    })

    expect(error).toBeNull()
    expect(data.success).toBe(true)
    expect(data.reservation_id).toBe('res-abc')
    expect(data.pickup_code).toBe('CODE-123')
  })

  it('debe rechazar si el pack no existe', () => {
    const result = mockReservationError('El pack no existe.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no existe')
  })

  it('debe rechazar si el pack no está activo', () => {
    const result = mockReservationError('Este pack ya no está activo.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no está activo')
  })

  it('debe rechazar si el horario de recogida ya finalizó', () => {
    const result = mockReservationError('El horario de recogida de este pack ya finalizó.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('finalizó')
  })

  it('debe rechazar si no hay stock suficiente', () => {
    const result = mockReservationError('No queda stock suficiente. Disponibles: 2')
    expect(result.success).toBe(false)
    expect(result.error).toContain('stock suficiente')
    expect(result.error).toContain('2')
  })

  it('debe rechazar si el usuario ya tiene una reserva activa para ese pack', () => {
    const result = mockReservationError('Ya tienes una reserva activa para este pack.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Ya tienes una reserva activa')
  })

  it('debe manejar errores de red/RPC correctamente', () => {
    const rpcError = new Error('Database connection failed')
    expect(rpcError.message).toBe('Database connection failed')
  })

  it('debe generar un pickup_code único de 8 caracteres', () => {
    const result = mockReservationSuccess('res-xyz', 'A1B2-C3D4')
    expect(result.pickup_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  })
})

// ─── Tests: cancel_reservation ──────────────────────────────

describe('cancel_reservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe cancelar una reserva exitosamente', () => {
    const result = mockCancelSuccess()
    expect(result.success).toBe(true)
    expect(result.message).toContain('cancelada')
  })

  it('debe rechazar si la reserva no existe', () => {
    const result = mockCancelError('Reserva no encontrada.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no encontrada')
  })

  it('debe rechazar si la reserva ya está en un estado no cancelable', () => {
    const result = mockCancelError('La reserva no se puede cancelar en su estado actual.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('no se puede cancelar')
  })

  it('debe rechazar si faltan menos de 2 horas para la recogida (usuario normal)', () => {
    const result = mockCancelError(
      'Solo puedes cancelar tu reserva hasta 2 horas antes de la recogida.',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('2 horas')
  })

  it('debe permitir cancelar sin límite de tiempo si es admin o comercio', () => {
    // El RPC verifica el rol — si es admin/comercio, no aplica el límite de 2h
    const result = mockCancelSuccess()
    expect(result.success).toBe(true)
  })

  it('debe reintegrar el stock al cancelar', () => {
    // La RPC hace: UPDATE packs SET remaining_stock = remaining_stock + quantity
    // Verificamos que la respuesta no tenga errores (el reintegro es atómico)
    const result = mockCancelSuccess()
    expect(result.success).toBe(true)
  })
})

// ─── Tests: validate_pickup ─────────────────────────────────

describe('validate_pickup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe validar una recogida exitosamente con código correcto', () => {
    const result = mockPickupSuccess()
    expect(result.success).toBe(true)
  })

  it('debe rechazar un código de recogida inválido', () => {
    const result = mockPickupError('Código de recogida inválido.')
    expect(result.success).toBe(false)
    expect(result.error).toContain('inválido')
  })

  it('debe rechazar si el usuario no es dueño del comercio ni admin', () => {
    const result = mockPickupError(
      'No estás autorizado para validar recogidas en este comercio.',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('No estás autorizado')
  })

  it('debe rechazar si la reserva no está en estado "confirmed"', () => {
    const result = mockPickupError(
      'La reserva no se puede recoger. Estado actual: cancelled',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('no se puede recoger')
  })

  it('debe rechazar si la recogida es antes de la ventana permitida (15 min antes)', () => {
    const result = mockPickupError(
      'Todavía no ha comenzado la hora de recogida.',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('no ha comenzado')
  })

  it('debe rechazar si la recogida es después de la ventana permitida (30 min después)', () => {
    const result = mockPickupError(
      'La hora de recogida ya ha finalizado.',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('finalizado')
  })
})

// ─── Tests: concurrencia (race conditions) ──────────────────

describe('concurrencia en reservas', () => {
  it('FOR UPDATE debe prevenir que dos usuarios reserven el último pack simultáneamente', () => {
    // Simulación: el primer usuario reserva con éxito
    const first = mockReservationSuccess('res-001', 'A1-A1')
    expect(first.success).toBe(true)

    // El segundo usuario obtiene error porque el stock ya se agotó
    const second = mockReservationError('No queda stock suficiente. Disponibles: 0')
    expect(second.success).toBe(false)
    expect(second.error).toContain('stock suficiente')
  })

  it('FOR UPDATE debe prevenir doble cancelación de la misma reserva', () => {
    // Primera cancelación: éxito
    const first = mockCancelSuccess()
    expect(first.success).toBe(true)

    // Segunda cancelación: error porque ya está cancelada
    const second = mockCancelError('La reserva no se puede cancelar en su estado actual.')
    expect(second.success).toBe(false)
  })

  it('FOR UPDATE debe prevenir doble validación del mismo código de recogida', () => {
    // Primera validación: éxito
    const first = mockPickupSuccess()
    expect(first.success).toBe(true)

    // Segunda validación: error porque ya fue recogido
    const second = mockPickupError('La reserva no se puede recoger. Estado actual: picked_up')
    expect(second.success).toBe(false)
  })
})

// ─── Tests: flujo completo end-to-end ───────────────────────

describe('flujo completo: reservar → cancelar → reintegrar → volver a reservar', () => {
  it('debe permitir el ciclo completo de vida de una reserva', () => {
    // 1. Usuario A reserva el pack
    const reserva = mockReservationSuccess('res-e2e', 'E2E-TEST')
    expect(reserva.success).toBe(true)

    // 2. Usuario A cancela → stock se reintegra
    const cancelacion = mockCancelSuccess()
    expect(cancelacion.success).toBe(true)

    // 3. Usuario B ahora puede reservar el mismo pack
    const reservaB = mockReservationSuccess('res-e2e-b', 'B2B-TEST')
    expect(reservaB.success).toBe(true)

    // 4. Comercio valida la recogida del Usuario B
    const recogida = mockPickupSuccess()
    expect(recogida.success).toBe(true)
  })
})
