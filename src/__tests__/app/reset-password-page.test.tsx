import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Lote UX punto 4: la página ya no fabrica su <Toast> local con estado propio;
 * los tres fallos posibles (contraseñas distintas, requisitos sin cumplir,
 * enlace inválido) viajan al ToastProvider global (role="alert").
 * El cartel viejo también se cerraba solo a los 4 s, así que no cambia el
 * comportamiento: cambia quién sirve el aviso.
 */
const updateUser = vi.hoisted(() => vi.fn())
const signOut = vi.hoisted(() => vi.fn(async () => {}))
const replace = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    auth: { updateUser, signOut },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

// Cumple las tres reglas reales de getPasswordChecks: 8+ caracteres, una
// mayúscula y un número.
const VALIDA = 'Nueva1234'

function renderPage() {
  return render(
    <ToastProvider>
      <ResetPasswordPage />
    </ToastProvider>,
  )
}

function fillAndSubmit(password: string, confirm: string) {
  const [nueva, confirmar] = screen.getAllByPlaceholderText('••••••••')
  fireEvent.change(nueva, { target: { value: password } })
  fireEvent.change(confirmar, { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }))
}

describe('reset-password page (toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateUser.mockImplementation(async () => ({ error: null }))
  })

  it('contraseñas distintas: aviso GLOBAL y no llama a Supabase', async () => {
    renderPage()

    fillAndSubmit(VALIDA, 'Otra1234')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Las contraseñas no coinciden')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('requisitos sin cumplir: aviso GLOBAL y no llama a Supabase', async () => {
    renderPage()

    fillAndSubmit('corta', 'corta')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('La contraseña no cumple todos los requisitos de seguridad')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('enlace inválido o expirado: aviso GLOBAL, sin pantalla de éxito', async () => {
    updateUser.mockImplementation(async () => ({ error: { message: 'Token expired' } }))
    renderPage()

    fillAndSubmit(VALIDA, VALIDA)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El enlace no es válido o ha expirado. Solicita uno nuevo.')
    expect(screen.queryByText('Contraseña actualizada!')).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('éxito: pantalla de confirmación, cierra sesión y ningún aviso', async () => {
    renderPage()

    fillAndSubmit(VALIDA, VALIDA)

    expect(await screen.findByText('Contraseña actualizada!')).toBeDefined()
    expect(updateUser).toHaveBeenCalledWith({ password: VALIDA })
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
