import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProfilePage from '@/app/(dashboard)/profile/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Lote UX punto 4: la página de perfil ya no fabrica dos <Toast> locales con
 * estado propio (error y success); los avisos de guardado viajan al
 * ToastProvider global (role="alert"). Cubre las dos acciones que avisan:
 * "Guardar cambios" (mutación) y el cambio de mercado (guardado inmediato).
 *
 * L-32: al guardar, el refresco del perfil debe ser silencioso. Antes se
 * llamaba a `getUser()` sin argumentos, que enciende la pantalla de carga y
 * desmonta el formulario entero: de ahí el "salto" con esqueleto que se veía.
 *
 * L-07: la subida de la foto ya existía entera en el hook (`uploadAvatar`),
 * pero la página no ofrecía ningún camino visible para usarla. Estos tests
 * fijan que el camino existe, que llama al hook y que avisa del resultado.
 */
const fixtures = vi.hoisted(() => ({
  profile: {
    id: 'user-a',
    role: 'user' as const,
    accountStatus: 'active',
    email: 'ana@example.com',
    displayName: 'Ana',
    phoneE164: '+56955551234',
    avatarPath: null,
    // `as string | null`: sin esto TypeScript infiere `null` a secas y no deja
    // ponerle una URL en el test de "con foto puesta".
    avatarPublicUrl: null as string | null,
    marketId: 'mkt-1',
    localityId: 'loc-1',
    locale: 'es-CL',
    onboardingCompletedAt: null,
    emailConfirmedAt: '2026-09-01T10:00:00Z',
    lastLoginAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    updateProfile: fixtures.updateProfile,
    uploadAvatar: fixtures.uploadAvatar,
    uploading: false,
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: fixtures.profile,
    loading: false,
    signOut: fixtures.signOut,
    getUser: fixtures.getUser,
  }),
}))

// El selector de mercado consulta Supabase por su cuenta; aquí solo interesa
// que avise a la página con un id, que es su contrato (`onSelect`).
vi.mock('@/components/dashboard/MarketSelect', () => ({
  default: ({ onSelect }: { onSelect: (marketId: string) => void }) => (
    <button type="button" onClick={() => onSelect('mkt-2')}>
      elegir-mercado-de-prueba
    </button>
  ),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('profile page (usuario · toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixtures.updateProfile.mockImplementation(async () => undefined)
    fixtures.uploadAvatar.mockImplementation(async () => 'https://cdn.test/avatar.png')
    fixtures.getUser.mockImplementation(async () => fixtures.profile)
    fixtures.profile.avatarPublicUrl = null
  })

  it('Guardar cambios con éxito: aviso GLOBAL y refresca el perfil', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Perfil actualizado correctamente')
    // L-32: el refresco tiene que pedir los datos EN SILENCIO (`skipLoading`).
    // Si alguien vuelve a pasar `getUser` a secas, la página entera se
    // sustituye por el spinner al guardar y este test falla.
    expect(fixtures.getUser).toHaveBeenCalledWith(true)
  })

  it('Guardar cambios con fallo: el mensaje del error sale como aviso GLOBAL', async () => {
    fixtures.updateProfile.mockImplementation(async () => {
      throw new Error('El teléfono no tiene un formato válido')
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El teléfono no tiene un formato válido')
  })

  it('cambiar el mercado: aviso GLOBAL de mercado actualizado', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'elegir-mercado-de-prueba' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Mercado actualizado. Ya puedes reservar packs de este mercado.')
    expect(fixtures.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ marketId: 'mkt-2' }))
    expect(fixtures.getUser).toHaveBeenCalledWith(true)
  })

  it('cambiar el mercado con fallo: aviso GLOBAL de error, no de éxito', async () => {
    fixtures.updateProfile.mockImplementation(async () => {
      throw new Error('El mercado no está activo')
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'elegir-mercado-de-prueba' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El mercado no está activo')
    expect(screen.queryByText(/Mercado actualizado/)).toBeNull()
  })
})

describe('profile page (L-07 · foto de perfil)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fixtures.updateProfile.mockImplementation(async () => undefined)
    fixtures.uploadAvatar.mockImplementation(async () => 'https://cdn.test/avatar.png')
    fixtures.getUser.mockImplementation(async () => fixtures.profile)
    fixtures.profile.avatarPublicUrl = null
  })

  function elegirArchivo(nombre: string, tipo: string) {
    const input = screen.getByLabelText(/foto/i) as HTMLInputElement
    const file = new File(['(bytes)'], nombre, { type: tipo })
    fireEvent.change(input, { target: { files: [file] } })
    return file
  }

  it('hay un camino visible para subir la foto, con los tipos que admite', () => {
    renderPage()

    const input = screen.getByLabelText(/Subir foto/) as HTMLInputElement
    expect(input.type).toBe('file')
    expect(input.accept).toBe('image/jpeg,image/png,image/webp')
    // Sin foto todavía: se ve el monigote y el botón dice "Subir foto".
    expect(screen.getByText('Foto de perfil')).toBeDefined()
    expect(screen.queryByRole('img', { name: /Foto de perfil/ })).toBeNull()
  })

  it('elegir una foto la sube, refresca el perfil en silencio y avisa', async () => {
    renderPage()

    const file = elegirArchivo('foto.png', 'image/png')

    await waitFor(() => expect(fixtures.uploadAvatar).toHaveBeenCalledTimes(1))
    expect(fixtures.uploadAvatar.mock.calls[0][1]).toBe(file)
    // El refresco, silencioso como en L-32.
    await waitFor(() => expect(fixtures.getUser).toHaveBeenCalledWith(true))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Foto de perfil actualizada')
  })

  it('si la subida falla, el motivo se queda como aviso y no se canta éxito', async () => {
    fixtures.uploadAvatar.mockImplementation(async () => {
      throw new Error('Tipo de archivo no permitido. Usa JPEG, PNG o WebP')
    })
    renderPage()

    elegirArchivo('foto.gif', 'image/gif')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Tipo de archivo no permitido. Usa JPEG, PNG o WebP')
    expect(screen.queryByText(/Foto de perfil actualizada/)).toBeNull()
    expect(fixtures.getUser).not.toHaveBeenCalled()
  })

  it('con foto puesta se ve la imagen y el botón pasa a decir "Cambiar foto"', () => {
    fixtures.profile.avatarPublicUrl = 'https://cdn.test/actual.png'
    renderPage()

    const img = screen.getByRole('img', { name: 'Foto de perfil de Ana' })
    // `next/image` reescribe el src al optimizador (/_next/image?url=...), así
    // que se comprueba que la URL de la foto va dentro, no el src literal.
    expect(img.getAttribute('src')).toContain('cdn.test%2Factual.png')
    expect(screen.getByLabelText(/Cambiar foto/)).toBeDefined()
  })
})
