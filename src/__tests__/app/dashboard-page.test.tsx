import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

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

const searchParamsState = vi.hoisted(() => ({
  params: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsState.params,
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
  searchParamsState.params = new URLSearchParams()
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

  it('actividad reciente: los enlaces apuntan a /reservations (la ruta canónica, no el 404 viejo)', async () => {
    authState.user = {
      id: 'user-a',
      displayName: 'User A Staging',
      marketId: '10000000-0000-4000-8000-000000000001',
    }
    reservationsState.reservations = [
      {
        reservation_id: 'r-1',
        shop_id: 'shop-a',
        pack_id: 'pack-1',
        pack_title: 'Pack Panadería Artesanal',
        shop_name: 'Panadería Staging A',
        shop_address: 'Calle 59a',
        status: 'payment_pending',
        payment_status: 'created',
        total_amount_minor: 3990,
        currency_code: 'CLP',
        pickup_start_at: '2026-07-15T19:00:00-04:00',
        pickup_end_at: '2026-07-15T22:00:00-04:00',
        timezone: 'America/Santiago',
        cancel_reason: null,
        created_at: '2026-07-15T12:00:00-04:00',
        image_path: null,
        updated_at: '2026-07-15T12:00:00-04:00',
        shop_latitude: null,
        shop_longitude: null,
      },
    ]
    render(<UserDashboardPage />)

    // La reserva activa aparece en la actividad reciente (también en la
    // tarjeta "Próxima recogida": por eso findAllByText).
    expect((await screen.findAllByText('Pack Panadería Artesanal')).length).toBeGreaterThan(0)
    // …con enlace canónico en "Ver todas"…
    expect(screen.getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/reservations')
    // …y ningún enlace del dashboard apunta a la ruta inexistente.
    const allLinks = screen.getAllByRole('link')
    expect(allLinks.some((l) => l.getAttribute('href') === '/dashboard/reservations')).toBe(false)
  })

  it('llegada con ?reserved=true: muestra el toast de reserva y limpia el parámetro de la URL', async () => {
    searchParamsState.params = new URLSearchParams('reserved=true')
    authState.user = {
      id: 'user-a',
      displayName: 'User A Staging',
      marketId: '10000000-0000-4000-8000-000000000001',
    }
    render(<UserDashboardPage />)

    expect(
      await screen.findByText('¡Reserva creada! El comercio la confirma pronto. Podrás seguirla en Mis reservas.'),
    ).toBeTruthy()
    // El parámetro se limpia de la URL sin recargar.
    await waitFor(() => expect(window.location.search).not.toContain('reserved='))
  })
})
