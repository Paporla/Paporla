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

function typeEmailAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'ana@example.com' } })
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
