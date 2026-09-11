import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProfilePage from '@/app/(dashboard)/profile/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Lote UX punto 4: la página de perfil ya no fabrica dos <Toast> locales con
 * estado propio (error y success); los avisos de guardado viajan al
 * ToastProvider global (role="alert"). Cubre las dos acciones que avisan:
 * "Guardar cambios" (mutación) y el cambio de mercado (guardado inmediato).
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
    avatarPublicUrl: null,
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
  getUser: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ updateProfile: fixtures.updateProfile }),
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
    fixtures.getUser.mockImplementation(async () => fixtures.profile)
  })

  it('Guardar cambios con éxito: aviso GLOBAL y refresca el perfil', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Perfil actualizado correctamente')
    expect(fixtures.getUser).toHaveBeenCalled()
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
