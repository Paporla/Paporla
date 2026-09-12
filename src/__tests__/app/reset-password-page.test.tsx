import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * L-31 (lote 9b): los tres fallos de esta página hay que LEERLOS para corregir
 * algo, así que ya no vuelan como avisos de 4 segundos.
 *
 * - "Las contraseñas no coinciden" → escrito debajo del campo Confirmar.
 * - "La contraseña no cumple los requisitos" → escrito debajo del campo
 *   Nueva contraseña, junto a la lista de requisitos (que ya era en vivo).
 * - "El enlace no es válido o ha expirado" → cartel FIJO (no se borra solo) con
 *   un enlace a "Solicitar un enlace nuevo", porque ese fallo no se arregla
 *   tipeando: hay que pedir otro correo.
 *
 * Se envuelve en ToastProvider igual que providers.tsx, aunque la página ya no
 * sirve ningún aviso: así se demuestra que no lo hace (queryAllByRole('alert')
 * se queda en 0 en los casos de validación).
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

function campos() {
  const [nueva, confirmar] = screen.getAllByPlaceholderText('••••••••')
  return { nueva, confirmar }
}

function fillAndSubmit(password: string, confirm: string) {
  const { nueva, confirmar } = campos()
  fireEvent.change(nueva, { target: { value: password } })
  fireEvent.change(confirmar, { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: /Actualizar contraseña/ }))
}

// L-38: la página solo enseña el formulario si se llega con la marca que pone
// /callback al venir del enlace del correo. En los tests se simula esa llegada.
function llegarDesdeElCorreo() {
  window.history.replaceState({}, '', '/reset-password?recovery=1')
}

function llegarDirecto() {
  window.history.replaceState({}, '', '/reset-password')
}

describe('reset-password page (L-31 · errores en línea)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateUser.mockImplementation(async () => ({ error: null }))
    llegarDesdeElCorreo()
  })

  it('contraseñas distintas: error debajo del campo, sin aviso volador, y no llama a Supabase', async () => {
    renderPage()

    fillAndSubmit(VALIDA, 'Otra1234')

    const { confirmar } = campos()
    await waitFor(() => expect(confirmar.getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText('Las contraseñas no coinciden')).toBeDefined()
    // Ni cartel de enlace caducado ni aviso global: solo el campo en rojo.
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('el error de "no coinciden" se va solo en cuanto las dos contraseñas cuadran', async () => {
    renderPage()

    fillAndSubmit(VALIDA, 'Otra1234')
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeDefined()

    const { confirmar } = campos()
    fireEvent.change(confirmar, { target: { value: VALIDA } })

    await waitFor(() => expect(screen.queryByText('Las contraseñas no coinciden')).toBeNull())
  })

  it('requisitos sin cumplir: error debajo del campo y lista de requisitos visible', async () => {
    renderPage()

    fillAndSubmit('corta', 'corta')

    const { nueva } = campos()
    await waitFor(() => expect(nueva.getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText('La contraseña no cumple todos los requisitos de seguridad')).toBeDefined()
    // La lista en vivo que dice qué falta sigue ahí.
    expect(screen.getByText('La contraseña debe tener:')).toBeDefined()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('enlace inválido o expirado: cartel FIJO con enlace a solicitar uno nuevo', async () => {
    updateUser.mockImplementation(async () => ({ error: { message: 'Token expired' } }))
    renderPage()

    fillAndSubmit(VALIDA, VALIDA)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El enlace no es válido o ha expirado.')

    // La salida está a mano y apunta a donde toca.
    const enlace = screen.getByRole('link', { name: /Solicitar un enlace nuevo/ })
    expect(enlace).toHaveAttribute('href', '/forgot-password')

    // No es un aviso con temporizador: sigue ahí después de interactuar con el
    // formulario (un toast de 4 s ya se habría esfumado).
    const { nueva } = campos()
    fireEvent.change(nueva, { target: { value: 'Otra9999' } })
    expect(screen.getByRole('alert')).toBeDefined()

    expect(screen.queryByText('Contraseña actualizada!')).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('éxito: pantalla de confirmación, cierra sesión y ningún cartel', async () => {
    renderPage()

    fillAndSubmit(VALIDA, VALIDA)

    expect(await screen.findByText('Contraseña actualizada!')).toBeDefined()
    expect(updateUser).toHaveBeenCalledWith({ password: VALIDA })
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('L-38 · llegando directamente (sin el enlace del correo) no hay formulario', async () => {
    llegarDirecto()
    renderPage()

    // Ni campos de contraseña ni botón: no hay manera de cambiar nada.
    await waitFor(() => expect(screen.queryByRole('button', { name: /Actualizar contraseña/ })).toBeNull())
    expect(screen.queryAllByPlaceholderText('••••••••')).toHaveLength(0)
    expect(updateUser).not.toHaveBeenCalled()

    // Y la pantalla dice qué ha pasado y por dónde se cambia la contraseña.
    expect(screen.getByText('Esta pantalla es para los enlaces que llegan por correo')).toBeDefined()
    expect(screen.getByText(/no se ha cambiado ninguna contraseña/)).toBeDefined()
    expect(screen.getByRole('link', { name: /Solicitar un enlace para cambiar mi contraseña/ })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('L-38 · con la marca del correo sí hay formulario', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /Actualizar contraseña/ })).toBeDefined()
    expect(screen.getAllByPlaceholderText('••••••••')).toHaveLength(2)
  })

  it('antes de intentar enviar no se regaña a nadie', () => {
    renderPage()

    const { nueva, confirmar } = campos()
    fireEvent.change(nueva, { target: { value: 'corta' } })
    fireEvent.change(confirmar, { target: { value: 'distinta' } })

    // La lista de requisitos sí aparece al tipear (ya lo hacía), pero ningún
    // campo se pone en rojo hasta que se pulsa el botón.
    expect(screen.queryByText('Las contraseñas no coinciden')).toBeNull()
    expect(screen.queryByText('La contraseña no cumple todos los requisitos de seguridad')).toBeNull()
    expect(confirmar.getAttribute('aria-invalid')).toBeNull()
  })
})
