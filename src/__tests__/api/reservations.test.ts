import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/reservationService', () => ({
  getUserReservations: vi.fn(),
  createReservation: vi.fn(),
  updateReservation: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getUserReservations, createReservation, updateReservation } from '@/lib/services/reservationService'

const mockCreateClient = vi.mocked(createClient)
const mockGetReservations = vi.mocked(getUserReservations)
const mockCreateReservation = vi.mocked(createReservation)
const mockUpdateReservation = vi.mocked(updateReservation)

const mockAuthUser = { id: 'user-1' }
const mockAuthenticatedClient = {
  auth: { getUser: () => Promise.resolve({ data: { user: mockAuthUser }, error: null }) },
}
const mockUnauthenticatedClient = {
  auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
}

describe('GET /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user reservations when authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockAuthenticatedClient as any)
    mockGetReservations.mockResolvedValue({
      data: [{ id: '1', status: 'confirmed' }],
    })

    const { GET } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations')
    const response = await GET(request)
    const body = await response.json()
    expect(body.reservations).toHaveLength(1)
    expect(response.status).toBe(200)
  })

  it('filters by shopId when provided', async () => {
    mockCreateClient.mockResolvedValue(mockAuthenticatedClient as any)
    mockGetReservations.mockResolvedValue({
      data: [{ id: '1', shop_id: 'shop-1' }],
    })

    const { GET } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations?shopId=shop-1')
    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(mockGetReservations).toHaveBeenCalledWith('user-1', 'shop-1')
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockUnauthenticatedClient as any)

    const { GET } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})

describe('POST /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a reservation when authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockAuthenticatedClient as any)
    mockCreateReservation.mockResolvedValue({
      data: { id: 'new-res', status: 'pending' },
      status: 201,
    })

    const { POST } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({ packId: 'pack-1', quantity: 1 }),
    })
    const response = await POST(request)
    const body = await response.json()
    expect(body.reservation).toBeDefined()
    expect(response.status).toBe(201)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockUnauthenticatedClient as any)

    const { POST } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({ packId: 'pack-1' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})

describe('PUT /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a reservation when authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockAuthenticatedClient as any)
    mockUpdateReservation.mockResolvedValue({
      data: { id: '1', status: 'picked_up' },
    })

    const { PUT } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations', {
      method: 'PUT',
      body: JSON.stringify({ id: '1', status: 'picked_up' }),
    })
    const response = await PUT(request)
    const body = await response.json()
    expect(body.reservation).toBeDefined()
    expect(response.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(mockUnauthenticatedClient as any)

    const { PUT } = await import('@/app/api/reservations/route')
    const request = new Request('http://localhost/api/reservations', {
      method: 'PUT',
      body: JSON.stringify({ id: '1' }),
    })
    const response = await PUT(request)
    expect(response.status).toBe(401)
  })
})
