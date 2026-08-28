import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminStatsPage from '@/app/(admin)/admin/stats/page'

/**
 * Página /admin/stats (Fase 6.6): si las consultas no responden o fallan, la
 * página NO se queda en el skeleton de carga para siempre: muestra su estado
 * de error con botón Reintentar.
 *
 * Se mockea useAdminStats (la fuente de datos) y los hijos (para aislar la
 * lógica de la página: carga → skeleton, error → mensaje + reintentar,
 * éxito → contenido).
 */

const statsState = vi.hoisted(() => ({
  loading: false,
  error: false,
  retry: undefined as undefined | (() => void),
  summary: { totalUsers: 50, totalShops: 10, totalPacks: 30, totalReservations: 200 },
  userStats: [] as Array<{ day: string; registrations: number }>,
  roleDistribution: [] as Array<{ name: string; value: number }>,
  topShops: [] as Array<{ name: string; reservations: number }>,
  growth: { users: 0 },
}))

vi.mock('@/components/admin/useAdminStats', () => ({
  useAdminStats: () => ({
    loading: statsState.loading,
    error: statsState.error,
    retry: statsState.retry,
    summary: statsState.summary,
    userStats: statsState.userStats,
    roleDistribution: statsState.roleDistribution,
    topShops: statsState.topShops,
    growth: statsState.growth,
  }),
}))
vi.mock('@/components/admin/StatsSummaryCards', () => ({ default: () => null }))
vi.mock('@/components/admin/StatsUserChart', () => ({ default: () => null }))
vi.mock('@/components/admin/StatsRolePie', () => ({ default: () => null }))
vi.mock('@/components/admin/StatsTopShops', () => ({ default: () => null }))
vi.mock('@/app/(admin)/admin/components/RevenueChart', () => ({ default: () => null }))

describe('AdminStatsPage (Fase 6.6: sin skeleton infinito)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    statsState.loading = false
    statsState.error = false
    statsState.retry = undefined
  })

  it('muestra el skeleton de carga mientras carga', () => {
    statsState.loading = true
    const { container } = render(<AdminStatsPage />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('Estadísticas')).toBeNull()
  })

  it('con error muestra el mensaje y el botón Reintentar (no el skeleton)', async () => {
    statsState.error = true
    const retry = vi.fn()
    statsState.retry = retry
    const { container } = render(<AdminStatsPage />)
    expect(await screen.findByText('No se pudieron cargar las estadísticas')).toBeTruthy()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('sin error muestra el contenido del panel', async () => {
    render(<AdminStatsPage />)
    expect(await screen.findByText('Estadísticas')).toBeTruthy()
  })
})
