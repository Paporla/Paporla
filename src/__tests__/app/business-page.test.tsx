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
  packs: [] as Record<string, unknown>[],
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
    packs: hookState.packs,
    recentReservations: hookState.recentReservations,
    loading: hookState.loading,
    error: hookState.error,
    stats: hookState.stats,
  }),
}))

vi.mock('@/components/business/TodayPickups', () => ({
  default: () => <div data-testid="today-pickups">Recogidas de hoy (stub)</div>,
}))

vi.mock('@/components/business/PickupCodeValidator', () => ({
  default: () => <div data-testid="pickup-validator">Validar código (stub)</div>,
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
    // Por defecto el comercio ya tiene un pack: el checklist «Primeros
    // pasos» no aparece y los tests históricos del panel siguen valiendo.
    packs: [{ id: 'pk-1', title: 'Pack Panadería Artesanal', status: 'active' }],
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
    // El validador de recogidas vive TAMBIÉN en el panel (Lote B): en la
    // hora pico el comercio valida sin navegar a Reservas.
    expect(screen.getByTestId('pickup-validator')).toBeInTheDocument()
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

  it('sin comercio: checklist «Primeros pasos» con el paso 1 activo (completar perfil)', () => {
    renderDashboard({ shop: null })
    expect(screen.getByText('¡Bienvenido a Paporla!')).toBeInTheDocument()
    expect(screen.getByText('Primeros pasos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute('href', '/business/profile')
    expect(screen.queryByText('Reservas hoy')).not.toBeInTheDocument()
  })

  it('comercio no verificado: checklist en el paso 2 (revisión), no el panel', () => {
    renderDashboard({ shop: { ...verifiedShop, status: 'pending_review', verified: false } })
    expect(screen.getByText('Primeros pasos')).toBeInTheDocument()
    expect(screen.getByText(/Estamos revisando tus datos/)).toBeInTheDocument()
    expect(screen.queryByText('Reservas hoy')).not.toBeInTheDocument()
  })

  it('verificado SIN packs: el panel completo incluye el checklist con «Crear mi primer pack»', () => {
    renderDashboard({ packs: [] })
    expect(screen.getByText('Primeros pasos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear mi primer pack' })).toHaveAttribute('href', '/business/packs/new')
    // El panel normal también está: el checklist convive con él.
    expect(screen.getByText('Reservas hoy')).toBeInTheDocument()
  })

  it('verificado CON packs: el checklist desaparece (camino completado)', () => {
    renderDashboard({ packs: [{ id: 'pk-1', title: 'Pack', status: 'active' }] })
    expect(screen.queryByText('Primeros pasos')).not.toBeInTheDocument()
    expect(screen.getByText('Reservas hoy')).toBeInTheDocument()
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
