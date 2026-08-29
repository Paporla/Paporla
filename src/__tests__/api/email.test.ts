import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

function postEmail(body: unknown): Promise<Response> {
  return import('@/app/api/email/route').then(({ POST }) =>
    POST(
      new Request('https://preview.paporla.test/api/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    ),
  )
}

describe('POST /api/email (f8.5 S6: sin password_reset)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'ana@test.com' } } })
  })

  it('sin sesion: 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await postEmail({ type: 'welcome', email: 'ana@test.com', data: { name: 'Ana' } })
    expect(res.status).toBe(401)
  })

  it('type password_reset: 400 de schema (tipo eliminado en f8.5)', async () => {
    const res = await postEmail({
      type: 'password_reset',
      email: 'ana@test.com',
      data: { resetLink: 'https://evil.example/reset' },
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('sigue rechazando types desconocidos: 400', async () => {
    const res = await postEmail({ type: 'otro_tipo', email: 'ana@test.com' })
    expect(res.status).toBe(400)
  })

  it('solo a si mismo: 403 si el email no es el del usuario', async () => {
    const res = await postEmail({ type: 'welcome', email: 'otra@test.com', data: { name: 'Ana' } })
    expect(res.status).toBe(403)
  })

  it('welcome valido a si mismo: 503 sin Resend configurado (entorno de test)', async () => {
    const res = await postEmail({ type: 'welcome', email: 'ana@test.com', data: { name: 'Ana' } })
    expect(res.status).toBe(503)
  })
})
