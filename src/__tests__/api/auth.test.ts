import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSignUp = vi.fn()
const mockMaybeSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser, signUp: mockSignUp },
    from: mockFrom,
  }),
}))

function setupProfileQuery() {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({ maybeSingle: mockMaybeSingle }),
    }),
  })
}

function registrationRequest(body: Record<string, unknown>) {
  return new Request('https://preview.paporla.test/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupProfileQuery()
  })

  it('rejects requests without an authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('@/app/api/auth/route')

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns the canonical profile fields for the current user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } } })
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'user', account_status: 'active', display_name: 'Usuario' },
      error: null,
    })
    const { GET } = await import('@/app/api/auth/route')

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.profile.display_name).toBe('Usuario')
  })

  it('fails closed for an inactive account', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'user@example.com' } } })
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'user', account_status: 'suspended' },
      error: null,
    })
    const { GET } = await import('@/app/api/auth/route')

    const response = await GET()

    expect(response.status).toBe(403)
  })
})

describe('POST /api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupProfileQuery()
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
  })

  it('normalizes signup metadata and uses the current Preview callback', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const request = registrationRequest({
      email: 'user@example.com',
      password: 'Password123',
      name: ' Usuario Uno ',
      phone: '+56 9 5555-1234',
      role: 'user',
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password123',
      options: {
        emailRedirectTo: 'https://preview.paporla.test/callback',
        data: {
          name: 'Usuario Uno',
          phone: '+56955551234',
          role: 'user',
          locale: 'es-CL',
        },
      },
    })
    expect(mockFrom).not.toHaveBeenCalledWith('shops')
  })

  it('never accepts an administrative signup role', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const request = registrationRequest({
      email: 'attacker@example.com',
      password: 'Password123',
      name: 'Attacker',
      role: 'admin',
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects a local phone number before calling Auth', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const request = registrationRequest({
      email: 'user@example.com',
      password: 'Password123',
      name: 'Usuario Uno',
      phone: '955551234',
      role: 'user',
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})
