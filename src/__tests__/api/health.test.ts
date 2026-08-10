import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy status when DB is connected', async () => {
    mockMaybeSingle.mockResolvedValue({ data: {}, error: null })

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.database).toBe('connected')
    expect(body.timestamp).toBeDefined()
    expect(body.uptime).toBeDefined()
  })

  it('returns degraded status when DB has error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('Connection refused') })

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.database).toBe('error')
  })

  it('includes version and environment', async () => {
    mockMaybeSingle.mockResolvedValue({ data: {}, error: null })

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(body.version).toBeDefined()
    expect(body.environment).toBe('test')
  })
})
