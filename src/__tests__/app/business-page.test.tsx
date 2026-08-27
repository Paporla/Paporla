import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BusinessDashboard from '@/app/(business)/business/page'

/**
 * Página de inicio del panel de comercio (tests de presentación): el hook de
 * datos se mockea completo (su lógica vive en useBusinessDashboard.test);
 * aquí se comprueba lo que el comercio VE: banner, cifras, actividad
 * reciente con etiquetas canónicas y los enlaces a Reservas.
 * TodayPickups y OnboardingBanner se stubean (lógica de datos ajena).
 */
const hookState = vi.hoisted(() => ({
  shop: null as Record<string, unknown> | null,
  stats: null as Record<string, number> | null,
  recentReservations: [] as Record<string, unknown>[],
  loading: false,
  error: null as string | null,
}))

const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/components/business/dashboard/useBusinessDashboard', () => ({
  useBusinessDashboard: () => ({
    shop: hookState.shop,
    packs: [] as Record<string, unknown>[],
    recentReservations: hookState.recentReservations,
    loading: hookState.loading,
    error: hookState.error,
    stats: hookState.stats,
  }),
}))

vi.mock('@/components/business/TodayPickups', () => ({
  default: () => <div data-testid="today-pickups">Recogidas de hoy (stub)</div>,
}))

vi.mock('@/components/onboarding/OnboardingBanner', () => ({
  default: () => null,
}))

const verifiedShop = {
  id: 'shop-a',
  name: 'Panadería Staging A',
  status: 'verified',
  verified: true,
  logo_url: null,
}

const baseStats = {
  activePacks: 2,
  totalPacks: 4,
  todayReservations: 1,
  totalReservations: 4,
  pendingReservations: 1,
  totalRevenue: 5490,
  weekGrowth: 200,
}

function resRow(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    pack_id: 'pk-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'ready_pickup',
    payment_status: 'paid',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T15:00:00-03:00',
    pickup_end_at: '2026-09-30T18:00:00-03:00',
    timezone: 'America/Santiago',
    created_at: '2026-09-30T10:00:00Z',
    ...overrides,
  }
}

function renderDashboard(overrides: Partial<typeof hookState> = {}) {
  Object.assign(hookState, {
    shop: verifiedShop,
    stats: baseStats,
    recentReservations: [
      resRow({ reservation_id: 'r-d' }),
      resRow({
        reservation_id: 'r-a',
        pack_title: 'Pack Quesos',
        customer_display_name: 'Cliente B',
        status: 'cancelled',
        total_amount_minor: 2000,
        created_at: '2026-09-20T10:00:00Z',
      }),
    ],
    loading: false,
    error: null,
    ...overrides,
  })
  mockUseAuth.mockReturnValue({ loading: false, user: { id: 'owner-a' } })
  return render(<BusinessDashboard />)
}

describe('BusinessDashboard (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el banner, las cifras y la actividad reciente del comercio verificado', () => {
    renderDashboard()

    expect(screen.getByText(/Panadería Staging A/)).toBeInTheDocument()
    // Ingresos: importe en la unidad menor (CLP: pesos), formato
    // DETERMINISTA de formatChilePesos: "$5.490" en cualquier máquina.
    expect(screen.getByText('$5.490')).toBeInTheDocument()
    expect(screen.getByText('Reservas hoy')).toBeInTheDocument()
  })

  it('la actividad reciente usa la etiqueta CANÓNICA del estado (no "Cancelado" para todo lo que no conoce)', () => {
    renderDashboard()

    // ready_pickup se pinta con su etiqueta real del módulo de reservas.
    expect(screen.getByText('Lista para recoger')).toBeInTheDocument()
    // cancelled mantiene su etiqueta.
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    // Cliente + importe en la unidad menor, con el formato determinista de
    // formatChilePesos (no Intl): "$3.990" exactamente, en cualquier máquina.
    expect(screen.getByText('Cliente A · $3.990')).toBeInTheDocument()
    expect(screen.getByText('Cliente B · $2.000')).toBeInTheDocument()
  })

  it('los enlaces a Reservas usan estados canónicos (?status= se respeta de verdad)', () => {
    renderDashboard()

    const links = Array.from(screen.getAllByRole('link')).map((l) => l.getAttribute('href'))
    expect(links).toContain('/business/reservations?status=payment_pending')
    // El parámetro legacy que antes dejaba el filtro "roto" ya no existe.
    expect(links.some((href) => href?.includes('status=pending'))).toBe(false)
  })

  it('sin comercio: invita a completar el perfil', () => {
    renderDashboard({ shop: null })
    expect(screen.getByText('Bienvenido a Paporla!')).toBeInTheDocument()
    expect(screen.getByText('Completar mi perfil de comercio')).toBeInTheDocument()
  })

  it('comercio no verificado: estado de revisión (no el panel)', () => {
    renderDashboard({ shop: { ...verifiedShop, status: 'pending_review', verified: false } })
    expect(screen.getByText('Comercio en revision')).toBeInTheDocument()
    expect(screen.queryByText('Reservas hoy')).not.toBeInTheDocument()
  })

  it('fallo de la RPC: tarjeta de error con el motivo en español y reintentar', () => {
    renderDashboard({
      error: 'Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.',
    })
    expect(screen.getByText('Error al cargar')).toBeInTheDocument()
    expect(
      screen.getByText('Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
