import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminDashboardPage from '@/app/(admin)/admin/page'
import { supabaseBrowser } from '@/lib/supabase/client'

// useAdminDashboard es el contrato de los contadores del panel: se mockea por
// completo. Lo que SÍ se prueba aquí son AlertsPanel y RecentActivity leyendo
// `activity_logs` con las columnas REALES (occurred_at/action/target_type,
// 0007) y no las inventadas (created_at/title/description).
// FASE 6.6: el mock incluye `error` y `retry` (estado de error con
// Reintentar en vez de skeleton infinito).
const dashboardState = vi.hoisted(() => ({
  stats: {
    totalUsers: 10,
    totalShops: 5,
    totalPacks: 20,
    totalReservations: 100,
    verifiedShops: 3,
    bannedShops: 1,
    pendingShops: 1,
  },
  reservationsByDay: [] as Array<{ day: string; reservations: number }>,
  loading: false,
  error: false,
  retry: vi.fn(),
}))

const useAdminDashboardMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/admin/useAdminDashboard', () => ({
  useAdminDashboard: useAdminDashboardMock,
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-1', email: 'admin@paporla.test' } }),
}))

/** Fila de activity_logs (0007:210–236) con las columnas reales. */
function activityRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'log-1',
    actor_user_id: 'admin-1',
    actor_role: 'admin',
    action: 'shop.reviewed',
    target_type: 'shop',
    target_id: 'shop-1',
    severity: 'error',
    request_id: null,
    market_id: 'mkt-1',
    metadata: {},
    occurred_at: '2026-08-27T10:00:00Z',
    ...overrides,
  }
}

function setupMockClient(rows: Array<Record<string, unknown>>) {
  // Reciente actividad: select().order().limit() → todas las filas.
  const recentLimit = vi.fn().mockResolvedValue({ data: rows, error: null })
  const recentOrder = vi.fn().mockReturnValue({ limit: recentLimit })
  // Alertas: select().in('severity', [...]).order().limit() → filtradas.
  const alertsIn = vi.fn().mockImplementation((_column: string, values: string[]) => ({
    order: vi.fn().mockReturnValue({
      limit: vi
        .fn()
        .mockResolvedValue({ data: rows.filter((r) => values.includes(r.severity as string)), error: null }),
    }),
  }))
  const select = vi.fn().mockReturnValue({ in: alertsIn, order: recentOrder })
  const from = vi.fn().mockReturnValue({ select })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })
}

describe('AdminDashboardPage (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dashboardState.loading = false
    dashboardState.error = false
    dashboardState.retry = vi.fn()
    useAdminDashboardMock.mockImplementation(() => ({
      loading: dashboardState.loading,
      error: dashboardState.error,
      retry: dashboardState.retry,
      stats: dashboardState.stats,
      reservationsByDay: dashboardState.reservationsByDay,
    }))
    setupMockClient([
      activityRow(),
      activityRow({ id: 'log-2', action: 'pack.created', target_type: 'pack', severity: 'info' }),
    ])
  })

  it('muestra la actividad real: action como título en ambos paneles (no log.title, que no existe)', async () => {
    render(<AdminDashboardPage />)
    // shop.reviewed (severidad error): aparece en Alertas Y en Actividad.
    expect(await screen.findAllByText('shop.reviewed')).toHaveLength(2)
    // pack.created (severidad info): solo en Actividad; info no va a Alertas.
    expect(await screen.findAllByText('pack.created')).toHaveLength(1)
  })

  it('la actividad muestra el rol del actor y no el estado vacío', async () => {
    render(<AdminDashboardPage />)
    // Las dos filas del mock tienen actor_role 'admin' (una por fila).
    expect(await screen.findAllByText('por admin')).toHaveLength(2)
    expect(screen.queryByText('No hay actividad reciente')).toBeNull()
  })

  it('saluda con el email del admin del panel', () => {
    render(<AdminDashboardPage />)
    expect(screen.getByText('Panel de Administración')).toBeTruthy()
    expect(screen.getByText('admin@paporla.test')).toBeTruthy()
  })

  it('Fase 6.6: con error de carga muestra el estado de error con Reintentar (no skeleton infinito)', async () => {
    dashboardState.error = true
    render(<AdminDashboardPage />)
    expect(await screen.findByText('No se pudo cargar el panel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(dashboardState.retry).toHaveBeenCalledTimes(1)
  })
})
