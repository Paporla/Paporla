import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RevenueChart from '@/app/(admin)/admin/components/RevenueChart'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * RevenueChart del panel admin (Fase 6.5, 0032): sobre la RPC
 * admin_dashboard_trend (vía useAdminTrend). La versión legacy hacía
 * .from('reservations') directo (denegado por el esquema 0012) y leía
 * total_price_cents (inexistente; el real es total_amount_minor), así que
 * siempre mostraba "no hay datos" aunque hubiera reservas.
 *
 * recharts se mockea: jsdom no mide layout y solo nos importa la capa de
 * datos (total, estados de error/vacío), no el SVG.
 */

vi.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const mockRpc = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const trendConDatos = {
  reservations_by_day: [],
  revenue_by_month: [
    { month: '2026-07', revenue_minor: 2000, commissions_minor: 200, count: 2 },
    { month: '2026-08', revenue_minor: 3990, commissions_minor: 399, count: 1 },
  ],
  top_shops: [],
  currency_code: 'CLP',
}

describe('RevenueChart admin (Fase 6.5, 0032)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: trendConDatos, error: null })
    ;(supabaseBrowser as any).mockReturnValue({ rpc: mockRpc })
  })

  it('llama a admin_dashboard_trend y pinta el total en CLP formateado', async () => {
    render(<RevenueChart />, { wrapper: createWrapper() })
    expect(await screen.findByText('$5.990')).toBeInTheDocument()
    expect(mockRpc).toHaveBeenCalledWith('admin_dashboard_trend')
  })

  it('rpc en error: estado de error honesto (no "no hay datos" a medias)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'ADMIN_REQUIRED', code: '42501' } })
    render(<RevenueChart />, { wrapper: createWrapper() })
    expect(await screen.findByText('No se pudieron cargar los datos de ingresos.')).toBeInTheDocument()
  })

  it('sin reservas completadas en ningún mes: estado vacío', async () => {
    mockRpc.mockResolvedValue({
      data: {
        reservations_by_day: [],
        revenue_by_month: [{ month: '2026-08', revenue_minor: 0, commissions_minor: 0, count: 0 }],
        top_shops: [],
        currency_code: 'CLP',
      },
      error: null,
    })
    render(<RevenueChart />, { wrapper: createWrapper() })
    expect(await screen.findByText('No hay datos de ingresos disponibles')).toBeInTheDocument()
  })
})
