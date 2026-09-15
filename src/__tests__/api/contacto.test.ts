import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A-03: durante meses este formulario DIO POR BUENO un mensaje que nunca
 * salía. Estos tests existen sobre todo para que eso no pueda volver a pasar:
 * la regla es que esta ruta NUNCA responde éxito si el correo no se ha enviado.
 */

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend }
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function postContacto(body: unknown): Promise<Response> {
  return import('@/app/api/contacto/route').then(({ POST }) =>
    POST(
      new Request('https://preview.paporla.test/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    ),
  )
}

const validBody = {
  name: 'Ana Rojas',
  email: 'ana@test.com',
  subject: 'Quiero publicar mi local',
  message: 'Buenas, tengo una panadería en Ñuñoa y me interesa publicar packs.',
}

describe('POST /api/contacto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  it('cuerpo ilegible: 400 y nunca éxito', async () => {
    const res = await postContacto('esto no es json')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('datos vacíos: 400 y no se intenta enviar nada', async () => {
    const res = await postContacto({ name: '', email: '', subject: '', message: '' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('nombre demasiado corto: 400 y señala el campo', async () => {
    const res = await postContacto({ ...validBody, name: 'A' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('name')
  })

  it('email con formato imposible: 400 y señala el campo', async () => {
    const res = await postContacto({ ...validBody, email: 'no-es-un-email' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.field).toBe('email')
  })

  it('mensaje demasiado corto: 400', async () => {
    const res = await postContacto({ ...validBody, message: 'hola' })
    expect(res.status).toBe(400)
    expect((await res.json()).field).toBe('message')
  })

  it('mensaje gigante: 400 (tope de 5000)', async () => {
    const res = await postContacto({ ...validBody, message: 'x'.repeat(5001) })
    expect(res.status).toBe(400)
  })

  it('trampa para robots rellena: no se envía correo', async () => {
    const res = await postContacto({ ...validBody, website: 'http://spam.example' })
    expect(res.status).toBe(200)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('SIN servicio de email: 503, error honesto y dirección de respaldo', async () => {
    // Sin RESEND_API_KEY no hay cliente posible.
    const res = await postContacto(validBody)
    expect(res.status).toBe(503)
    const body = await res.json()
    // La regla de oro: nunca éxito si el correo no salió.
    expect(body.success).toBe(false)
    expect(body.fallbackEmail).toBeTruthy()
    expect(mockSend).not.toHaveBeenCalled()
  })

  describe('con el servicio de email configurado', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_key'
    })

    it('mensaje válido: 200, envía y pone replyTo con la dirección de quien escribe', async () => {
      const res = await postContacto(validBody)
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)

      expect(mockSend).toHaveBeenCalledTimes(1)
      const payload = mockSend.mock.calls[0][0]
      expect(payload.replyTo).toBe(validBody.email)
      expect(payload.subject).toContain(validBody.subject)
      // El HTML va escapado: nada de HTML crudo del visitante.
      expect(payload.html).toContain('Ana Rojas')
    })

    it('el servicio falla: 502, error honesto y dirección de respaldo', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'boom' } })
      const res = await postContacto(validBody)
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.fallbackEmail).toBeTruthy()
    })

    it('el HTML del mensaje va escapado (nada de inyección)', async () => {
      const res = await postContacto({
        ...validBody,
        message: '<script>alert(1)</script> hola',
      })
      expect(res.status).toBe(200)
      const payload = mockSend.mock.calls[0][0]
      expect(payload.html).not.toContain('<script>')
      expect(payload.html).toContain('&lt;script&gt;')
    })

    it('los saltos de línea del mensaje se conservan', async () => {
      await postContacto({ ...validBody, message: 'linea uno\nlinea dos' })
      const payload = mockSend.mock.calls[0][0]
      expect(payload.html).toContain('linea uno<br>linea dos')
    })
  })
})
