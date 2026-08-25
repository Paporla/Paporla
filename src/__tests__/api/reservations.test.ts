import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createClient)
const mockRpc = vi.fn()
const mockAuthUser = { id: 'user-1' }

function makeClient(withSession: boolean) {
  return {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: withSession ? { user: mockAuthUser } : null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: withSession ? mockAuthUser : null }, error: null }),
    },
    rpc: mockRpc,
  }
}

/**
 * Fila de list_my_reservations tal como llega por PostgREST: total_amount_minor
 * es bigint y viaja como STRING. El route debe convertirlo a number.
 */
const filaEjemplo = {
  reservation_id: 'r-1',
  shop_id: 's-1',
  pack_id: 'p-1',
  pack_title: 'Pack sorpresa',
  shop_name: 'Tienda de ejemplo',
  shop_address: 'Calle Test 123',
  status: 'payment_pending',
  payment_status: 'pending',
  total_amount_minor: '2999',
  currency_code: 'CLP',
  pickup_start_at: '2026-09-04T19:00:00-04:00',
  pickup_end_at: '2026-09-04T23:00:00-04:00',
  timezone: 'America/Santiago',
  cancel_reason: null,
  created_at: '2026-08-24T12:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/reservations', () => {
  it('devuelve 401 sin sesión y no llama al RPC', async () => {
    mockCreateClient.mockResolvedValue(makeClient(false) as any)
    const { GET } = await import('@/app/api/reservations/route')
    const response = await GET(new Request('http://localhost/api/reservations'))
    expect(response.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('llama a list_my_reservations sin cursor y devuelve las filas', async () => {
    mockRpc.mockResolvedValue({ data: [filaEjemplo], error: null })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { GET } = await import('@/app/api/reservations/route')
    const response = await GET(new Request('http://localhost/api/reservations'))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.reservations).toHaveLength(1)
    expect(mockRpc).toHaveBeenCalledWith('list_my_reservations', {
      p_before_created_at: null,
      p_before_reservation_id: null,
      p_limit: 50,
    })
  })

  it('convierte el bigint de total_amount_minor a number', async () => {
    mockRpc.mockResolvedValue({ data: [filaEjemplo], error: null })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { GET } = await import('@/app/api/reservations/route')
    const response = await GET(new Request('http://localhost/api/reservations'))
    const body = await response.json()
    expect(body.reservations[0].total_amount_minor).toBe(2999)
    expect(typeof body.reservations[0].total_amount_minor).toBe('number')
  })

  it('pasa el cursor tal cual cuando viene en la URL', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { GET } = await import('@/app/api/reservations/route')
    const response = await GET(
      new Request('http://localhost/api/reservations?beforeCreatedAt=2026-01-02T00:00:00Z&beforeId=r-9'),
    )
    expect(response.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('list_my_reservations', {
      p_before_created_at: '2026-01-02T00:00:00Z',
      p_before_reservation_id: 'r-9',
      p_limit: 50,
    })
  })

  it('traduce el error del RPC en vez de soltar el mensaje de Postgres', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'CALLER_NOT_ACTIVE', code: 'P0001' },
    })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { GET } = await import('@/app/api/reservations/route')
    const response = await GET(new Request('http://localhost/api/reservations'))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toBe('Tu cuenta no está activa. Inicia sesión de nuevo.')
  })
})

describe('PUT /api/reservations', () => {
  function putRequest(body: unknown) {
    return new Request('http://localhost/api/reservations', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  it('devuelve 401 sin sesión', async () => {
    mockCreateClient.mockResolvedValue(makeClient(false) as any)
    const { PUT } = await import('@/app/api/reservations/route')
    const response = await PUT(putRequest({ id: 'r-1', cancel_reason: 'motivo valido' }))
    expect(response.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rechaza sin id, sin gastar el RPC', async () => {
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { PUT } = await import('@/app/api/reservations/route')
    const response = await PUT(putRequest({ cancel_reason: 'motivo de tres letras' }))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toContain('identificador')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('rechaza un motivo con menos de 3 letras, sin gastar el RPC', async () => {
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { PUT } = await import('@/app/api/reservations/route')
    const response = await PUT(putRequest({ id: 'r-1', cancel_reason: 'ab' }))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toContain('al menos 3 letras')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('llama a cancel_reservation con los parámetros canónicos y confirma', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { PUT } = await import('@/app/api/reservations/route')
    const response = await PUT(putRequest({ id: 'r-1', cancel_reason: 'ya no puedo ir a esa hora' }))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Reserva cancelada')
    // Guardia de regresión: la firma real en la base (0009:366) es
    // cancel_reservation(p_reservation_id uuid, p_reason text). Si un día el
    // route vuelve a enviar otro nombre (p. ej. p_cancel_reason), PostgREST
    // responde "Could not find the function" y este test debe fallar.
    expect(mockRpc).toHaveBeenCalledWith('cancel_reservation', {
      p_reservation_id: 'r-1',
      p_reason: 'ya no puedo ir a esa hora',
    })
  })

  it('traduce CANCELLATION_WINDOW_CLOSED con el error de la base', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'CANCELLATION_WINDOW_CLOSED', code: 'P0001' },
    })
    mockCreateClient.mockResolvedValue(makeClient(true) as any)
    const { PUT } = await import('@/app/api/reservations/route')
    const response = await PUT(putRequest({ id: 'r-1', cancel_reason: 'cambio de planes' }))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.error).toBe('Pasó el plazo para cancelar esta reserva.')
  })
})
