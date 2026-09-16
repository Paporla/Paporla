import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContactoPage from '@/app/(public)/contacto/page'

/**
 * A-03: la página de contacto dio por bueno un mensaje que nunca envió.
 *
 * Estos tests fijan dos reglas:
 *
 * 1. **NUNCA se muestra "enviado" si el servidor no confirmó el envío.**
 *    Es la regla de oro: un éxito falso es peor que un error honesto.
 *
 * 2. **La petición lleva el token CSRF.** El middleware exige doble envío
 *    (cookie + cabecera) en TODAS las mutaciones de /api. La primera versión
 *    de este formulario montó el fetch a mano, sin el helper `apiHeaders()`,
 *    y se estrelló con un 403 "Token CSRF requerido para mutaciones".
 *    Este test existe para que no se vuelva a caer en lo mismo.
 */

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  // El middleware pone esta cookie al servir la página; es legible por JS
  // a propósito (patrón de doble envío).
  document.cookie = 'csrf_token=token-de-prueba'
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'csrf_token=; max-age=0; path=/'
})

function rellenarFormulario() {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), {
    target: { name: 'name', value: 'Ana Rojas' },
  })
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { name: 'email', value: 'ana@test.com' },
  })
  fireEvent.change(screen.getByLabelText(/asunto/i), {
    target: { name: 'subject', value: 'Quiero publicar mi local' },
  })
  fireEvent.change(screen.getByLabelText(/mensaje/i), {
    target: { name: 'message', value: 'Tengo una panadería en Ñuñoa y me interesa.' },
  })
}

describe('Página de contacto (A-03)', () => {
  it('ENVÍA la petición con el token CSRF en la cabecera', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    })

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/contacto')
    expect(options.method).toBe('POST')
    expect(options.headers['X-CSRF-Token']).toBe('token-de-prueba')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('el cuerpo incluye la trampa para robots (campo website)', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) })

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).toHaveProperty('website')
    expect(body.website).toBe('')
  })

  it('éxito real: muestra la confirmación y vacía el formulario', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) })

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(screen.getByRole('status').textContent).toContain('Mensaje enviado')
  })

  it('REGLA DE ORO: si el servidor falla, NUNCA dice "enviado"', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: 'El envío automático no está disponible ahora mismo.',
        fallbackEmail: 'hola@paporla.com',
      }),
    })

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())

    // Ni rastro del mensaje de éxito.
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/mensaje enviado/i)).toBeNull()
    // Pero SÍ ofrece una salida.
    expect(screen.getByRole('alert').textContent).toContain('hola@paporla.com')
  })

  it('si la red falla del todo, tampoco dice "enviado"', async () => {
    mockFetch.mockRejectedValue(new Error('sin red'))

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText(/mensaje enviado/i)).toBeNull()
  })

  it('sin cookie CSRF: no dispara la petición y avisa (en vez de un 403 a ciegas)', async () => {
    document.cookie = 'csrf_token=; max-age=0; path=/'

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/recarga la página/i)
  })

  it('el error de un campo va junto a ese campo y NO se repite en el cartel', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'Ese email no parece válido', field: 'email' }),
    })

    render(<ContactoPage />)
    rellenarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /enviar mensaje/i }))

    await waitFor(() => expect(screen.getByText('Ese email no parece válido')).toBeTruthy())

    // Si el mensaje saliera dos veces (junto al campo y en el cartel de
    // arriba), getByText lanzaría "Found multiple elements". Que llegue aquí
    // significa que solo se pinta una vez.
    expect(screen.getByRole('alert').textContent).toMatch(/revisa el campo/i)
    expect(screen.getByRole('alert').textContent).not.toContain('Ese email no parece válido')
  })

  it('siempre hay una forma de escribir por correo, sin depender del formulario', () => {
    render(<ContactoPage />)
    const enlace = screen.getAllByRole('link').find((a) => (a.getAttribute('href') ?? '').startsWith('mailto:'))
    expect(enlace).toBeTruthy()
    expect(enlace?.getAttribute('href')).toContain('hola@paporla.com')
  })
})
