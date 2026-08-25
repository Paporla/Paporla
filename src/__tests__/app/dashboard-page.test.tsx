import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Dashboard de usuario: el banner "elige tu mercado" (red F2b del bloqueo
 * MARKET_MISMATCH de 0009:285) debe aparecer SOLO cuando el perfil no tiene
 * mercado, y el resto del dashboard debe cargar igual.
 */

// Estado MUTABLE compartido con el mock: cada test fija el user antes de
// render. La identidad del objeto se mantiene ESTABLE entre renders de la
// misma prueba (si cambiara, los efectos con [user] en dependencias
// re-ejecutarían en bucle).
const authState = vi.hoisted(() => ({
  user: { id: 'user-a', displayName: 'User A Staging', marketId: null as string | null },
}))

const reservationsState = vi.hoisted(() => ({
  reservations: [] as unknown[],
  loading: false,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReservations', () => ({
  useReservations: () => ({
    reservations: reservationsState.reservations,
    loading: reservationsState.loading,
    error: null,
    cancelReservation: vi.fn(),
    cancelling: false,
    invalidate: vi.fn(),
  }),
}))

// El módulo real lanza si faltan las variables de entorno (client.ts);
// además la página no llama al cliente en estos tests (sin reservas no se
// renderiza NextPickupCard), pero el mock deja la importación del árbol segura.
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  }),
}))

import UserDashboardPage from '@/app/(dashboard)/dashboard/page'

beforeEach(() => {
  authState.user = { id: 'user-a', displayName: 'User A Staging', marketId: null }
  reservationsState.reservations = []
  reservationsState.loading = false
})

describe('UserDashboardPage (banner de mercado)', () => {
  it('perfil sin mercado: muestra el banner con enlace a /profile', async () => {
    render(<UserDashboardPage />)
    expect(await screen.findByText('Para reservar packs, elige tu mercado')).toBeDefined()
    expect(screen.getByRole('link', { name: /Elegir mi mercado/ })).toHaveAttribute('href', '/profile')
  })

  it('perfil con mercado: el dashboard carga y el banner no aparece', async () => {
    authState.user = {
      id: 'user-a',
      displayName: 'User A Staging',
      marketId: '10000000-0000-4000-8000-000000000001',
    }
    render(<UserDashboardPage />)
    // El dashboard sí carga (banner de bienvenida visible)…
    expect(await screen.findByText(/User A Staging/)).toBeDefined()
    // …y el banner de mercado no está.
    expect(screen.queryByText('Para reservar packs, elige tu mercado')).toBeNull()
    expect(screen.queryByRole('link', { name: /Elegir mi mercado/ })).toBeNull()
  })
})
