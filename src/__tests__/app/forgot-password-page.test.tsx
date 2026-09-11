import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Piloto de la migración a toasts globales (Lote UX punto 4): la página ya
 * no fabrica su <Toast> local con estado propio; el error viaja al
 * ToastProvider (role="alert"), que es el único camarero de avisos de la
 * app. Los tests envuelven la página en el provider igual que hace
 * providers.tsx en producción.
 *
 * L-27 (copia honesta): Supabase no revela si existe una cuenta con el
 * correo escrito (anti-enumeración) y con un correo desconocido NO manda
 * nada aunque conteste sin error. La pantalla de éxito, por tanto, no puede
 * afirmar "te enviamos un enlace": estos tests fijan esa condición.
 */
const authState = vi.hoisted(() => ({
  resetError: null as { message: string } | null,
}))

const resetPasswordForEmail = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: { resetPasswordForEmail },
  }),
}))

function renderPage() {
  return render(
    <ToastProvider>
      <ForgotPasswordPage />
    </ToastProvider>,
  )
}

function typeEmailAndSubmit(email = 'ana@example.com') {
  fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: /Enviar enlace/ }))
}

describe('forgot-password page (toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.resetError = null
    resetPasswordForEmail.mockImplementation(async () => ({ error: authState.resetError }))
  })

  it('fallo de Supabase: el error sale como toast GLOBAL (role=alert), no como Toast local', async () => {
    authState.resetError = { message: 'Demasiados intentos. Espera un minuto.' }
    renderPage()

    typeEmailAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Demasiados intentos')
  })

  it('éxito: pantalla de confirmación y ningún toast', async () => {
    renderPage()

    typeEmailAndSubmit()

    expect(await screen.findByText('Revisa tu correo')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('llama a resetPasswordForEmail con el correo escrito y el redirect canónico', async () => {
    renderPage()

    typeEmailAndSubmit()

    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1)
    expect(resetPasswordForEmail.mock.calls[0][0]).toBe('ana@example.com')
    expect(resetPasswordForEmail.mock.calls[0][1].redirectTo).toContain('/callback?next=/reset-password')
  })
})

describe('forgot-password page (L-27 · copia honesta)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.resetError = null
    resetPasswordForEmail.mockImplementation(async () => ({ error: authState.resetError }))
  })

  it('NO afirma que envió el enlace: la respuesta de Supabase no dice si la cuenta existe', async () => {
    renderPage()

    typeEmailAndSubmit('correo-inventado@test.com')

    expect(await screen.findByText('Revisa tu correo')).toBeDefined()
    // La copia antigua ("Te enviamos un enlace a X") prometía un hecho que
    // con un correo inexistente no ocurre. Debe estar condicional.
    expect(screen.queryByText(/Te enviamos/i)).toBeNull()
    expect(screen.getByText(/Si hay una cuenta registrada con/)).toBeDefined()
    expect(screen.getByText(/No te confirmamos si ese correo existe/)).toBeDefined()
    // El correo escrito se sigue mostrando, para detectar la errata.
    expect(screen.getByText('correo-inventado@test.com')).toBeDefined()
  })

  it('"Probar con otro correo" devuelve al formulario con el campo vacío', async () => {
    renderPage()

    typeEmailAndSubmit('correo-inventado@test.com')
    expect(await screen.findByText('Revisa tu correo')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /Probar con otro correo/ }))

    expect(screen.queryByText('Revisa tu correo')).toBeNull()
    const input = (await screen.findByPlaceholderText('tu@email.com')) as HTMLInputElement
    expect(input.value).toBe('')
    // No se ha vuelto a llamar a Supabase al retroceder.
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1)
  })
})
