import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BusinessAnalyticsPage from '@/app/(business)/business/analytics/page'

/**
 * Página de estadísticas del comercio (tests de presentación): el hook se
 * mockea completo (su lógica vive en useBusinessAnalytics.test). Se pasa
 * tendencia/horarios vacíos y tasa de éxito en ceros para que los gráficos
 * recharts no se monten en jsdom: su contenido numérico lo cubre el test del
 * hook, aquí se comprueba lo que el comercio VE (resumen, top packs,
 * comparativa, estados vacíos y de error).
 */
const hookState = vi.hoisted(() => ({
  loading: false,
  error: null as string | null,
  shop: null as Record<string, unknown> | null,
  summary: {
    totalRevenue: 3990,
    totalReservations: 4,
    completedReservations: 2,
    cancelledReservations: 1,
    noShows: 0,
    activePacks: 1,
    totalPacksCreated: 2,
  } as Record<string, number>,
  revenueTrend: [] as Record<string, number>[],
  reservationTrend: [] as Record<string, number>[],
  peakHours: [] as Record<string, number>[],
  topPacks: [
    {
      id: 'pk-1',
      title: 'Pack Panadería Artesanal',
      totalSold: 2,
      revenue: 5490,
      cancellationRate: 33,
    },
  ] as Record<string, unknown>[],
  cancellationRate: { completed: 0, cancelled: 0, noShow: 0, expired: 0 },
  weeklyComparison: {
    currentWeek: { reservations: 2, revenue: 3990 },
    lastWeek: { reservations: 2, revenue: 1500 },
    reservationChange: 0,
    revenueChange: 166,
  },
}))

vi.mock('@/components/business/analytics/useBusinessAnalytics', () => ({
  useBusinessAnalytics: () => ({
    loading: hookState.loading,
    error: hookState.error,
    shop: hookState.shop,
    summary: hookState.summary,
    revenueTrend: hookState.revenueTrend,
    reservationTrend: hookState.reservationTrend,
    peakHours: hookState.peakHours,
    topPacks: hookState.topPacks,
    cancellationRate: hookState.cancellationRate,
    weeklyComparison: hookState.weeklyComparison,
  }),
}))

const shop = { id: 'shop-a', name: 'Panadería Staging A', verified: true, logo_url: null }

function renderPage(overrides: Partial<typeof hookState> = {}) {
  Object.assign(hookState, {
    loading: false,
    error: null,
    shop,
    ...overrides,
  })
  return render(<BusinessAnalyticsPage />)
}

describe('BusinessAnalyticsPage (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el resumen, el top de packs y la comparativa con importes en la unidad menor', () => {
    renderPage()

    expect(screen.getByText('Analisis completo de Panadería Staging A')).toBeInTheDocument()
    // CLP en pesos con el formato DETERMINISTA de formatChilePesos
    // (independiente de la ICU del dispositivo). "$3.990" aparece DOS
    // veces: tarjeta de ingresos totales y "Esta semana" de la comparativa.
    expect(screen.getAllByText('$3.990')).toHaveLength(2)
    expect(screen.getByText('$1.500')).toBeInTheDocument()
    expect(screen.getByText('Pack Panadería Artesanal')).toBeInTheDocument()
    expect(screen.getByText('2 vendidos')).toBeInTheDocument()
  })

  it('sin comercio: estado vacío que invita a registrar (no ceros)', () => {
    renderPage({ shop: null })
    expect(screen.getByText('Registra tu comercio para ver las estadisticas.')).toBeInTheDocument()
  })

  it('fallo de la RPC: tarjeta de error con el motivo en español y reintentar', () => {
    renderPage({
      error: 'Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.',
    })
    expect(screen.getByText('Error al cargar las estadísticas')).toBeInTheDocument()
    expect(
      screen.getByText('Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
