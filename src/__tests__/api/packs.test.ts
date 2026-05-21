import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/services/packService', () => ({
  getPacks: vi.fn(),
  createPack: vi.fn(),
  updatePack: vi.fn(),
  deletePack: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getPacks, createPack, updatePack, deletePack } from '@/lib/services/packService'

const mockCreateClient = vi.mocked(createClient)
const mockGetPacks = vi.mocked(getPacks)
const mockCreatePack = vi.mocked(createPack)
const mockUpdatePack = vi.mocked(updatePack)
const mockDeletePack = vi.mocked(deletePack)

describe('GET /api/packs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all packs when no id param', async () => {
    mockGetPacks.mockResolvedValue({ data: [{ id: '1', title: 'Pack 1' }] })
    const { GET } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs')
    const response = await GET(request)
    const body = await response.json()
    expect(body.packs).toHaveLength(1)
    expect(response.status).toBe(200)
  })

  it('returns single pack when id param provided', async () => {
    mockGetPacks.mockResolvedValue({ data: { id: '1', title: 'Pack 1' } })
    const { GET } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs?id=1')
    const response = await GET(request)
    const body = await response.json()
    expect(body.pack).toBeDefined()
    expect(response.status).toBe(200)
  })

  it('returns error when service fails', async () => {
    mockGetPacks.mockResolvedValue({ error: 'Not found', status: 404 })
    const { GET } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs')
    const response = await GET(request)
    const body = await response.json()
    expect(body.error).toBe('Not found')
    expect(response.status).toBe(404)
  })
})

describe('POST /api/packs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a pack when authenticated', async () => {
    const mockUser = { id: 'user-1' }
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }) },
    } as any)
    mockCreatePack.mockResolvedValue({ data: { id: 'new-pack', title: 'New Pack' }, status: 201 })

    const { POST } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Pack', price_cents: 1000 }),
    })
    const response = await POST(request)
    const body = await response.json()
    expect(body.pack).toBeDefined()
    expect(response.status).toBe(201)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any)

    const { POST } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Pack' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})

describe('PUT /api/packs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a pack when authenticated', async () => {
    const mockUser = { id: 'user-1' }
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }) },
    } as any)
    mockUpdatePack.mockResolvedValue({ data: { id: '1', title: 'Updated' } })

    const { PUT } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs', {
      method: 'PUT',
      body: JSON.stringify({ id: '1', title: 'Updated' }),
    })
    const response = await PUT(request)
    const body = await response.json()
    expect(body.pack).toBeDefined()
    expect(response.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any)

    const { PUT } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs', {
      method: 'PUT',
      body: JSON.stringify({ id: '1' }),
    })
    const response = await PUT(request)
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/packs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a pack when authenticated', async () => {
    const mockUser = { id: 'user-1' }
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }) },
    } as any)
    mockDeletePack.mockResolvedValue({ data: { success: true } })

    const { DELETE } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs?id=1', {
      method: 'DELETE',
    })
    const response = await DELETE(request)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(response.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any)

    const { DELETE } = await import('@/app/api/packs/route')
    const request = new Request('http://localhost/api/packs?id=1', {
      method: 'DELETE',
    })
    const response = await DELETE(request)
    expect(response.status).toBe(401)
  })
})
