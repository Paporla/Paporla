import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TodayPickups from '@/components/business/TodayPickups'
import { supabaseBrowser } from '@/lib/supabase/client'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

const state = vi.hoisted(() => ({
  realDateKey: null as unknown,
}))

// Solo se intercepta dateKeyInTimezone (el "hoy"); la conversión de zona
// horaria real se prueba en src/__tests__/utils/formatDate.test.ts.
vi.mock('@/lib/utils/formatDate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/formatDate')>()
  state.realDateKey = actual.dateKeyInTimezone
  return { ...actual, dateKeyInTimezone: vi.fn(actual.dateKeyInTimezone) }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

let rpc: ReturnType<typeof vi.fn>
let from: ReturnType<typeof vi.fn>

/** Fila canónica de list_shop_reservations. Julio: invierno chileno (UTC-4 en cualquier tzdb). */
function row(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    pack_id: 'p-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'ready_pickup',
    payment_status: 'paid',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-07-15T15:00:00-04:00',
    pickup_end_at: '2026-07-15T18:00:00-04:00',
    timezone: 'America/Santiago',
    created_at: '2026-07-10T12:00:00Z',
    ...overrides,
  }
}

function setupMockClient(rowsByStatus: Record<string, unknown[]>) {
  rpc = vi.fn().mockImplementation((name: string, args?: Record<string, unknown>) => {
    if (name === 'list_shop_reservations') {
      const status = (args?.p_status as string | null) ?? 'all'
      return Promise.resolve({ data: rowsByStatus[status] ?? [], error: null })
    }
    return Promise.resolve({ data: { success: true }, error: null })
  })
  from = vi.fn()
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ rpc, from })
}

describe('TodayPickups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // "Hoy" fijo: 2026-07-15. El instante real del test cae en el default.
    ;(dateKeyInTimezone as unknown as { mockImplementation: (fn: unknown) => void }).mockImplementation(
      (iso: string | null) => {
        if (!iso) return ''
        if (iso === '2026-07-15T15:00:00-04:00' || iso === '2026-07-15T18:00:00-04:00') return '2026-07-15'
        if (iso === '2026-07-16T15:00:00-04:00' || iso === '2026-07-16T18:00:00-04:00') return '2026-07-16'
        if (iso === '2026-07-14T15:00:00-04:00' || iso === '2026-07-14T18:00:00-04:00') return '2026-07-14'
        return '2026-07-15'
      },
    )
  })

  it('solo muestra recogidas cuya ventana cruce hoy (ready_pickup y confirmed)', async () => {
    setupMockClient({
      ready_pickup: [
        row({ reservation_id: 'r-1', customer_display_name: 'De Hoy' }),
        row({
          reservation_id: 'r-3',
          customer_display_name: 'De Ayer',
          pickup_start_at: '2026-07-14T15:00:00-04:00',
          pickup_end_at: '2026-07-14T18:00:00-04:00',
        }),
      ],
      confirmed: [
        row({
          reservation_id: 'r-2',
          status: 'confirmed',
          customer_display_name: 'De Mañana',
          pickup_start_at: '2026-07-16T15:00:00-04:00',
          pickup_end_at: '2026-07-16T18:00:00-04:00',
        }),
        row({ reservation_id: 'r-5', status: 'confirmed', customer_display_name: 'Confirmada Hoy' }),
      ],
    })
    render(<TodayPickups shopId="shop-a" />, { wrapper: createWrapper() })
    expect(await screen.findByText('De Hoy')).toBeTruthy()
    expect(screen.getByText('Confirmada Hoy')).toBeTruthy()
    expect(screen.queryByText('De Mañana')).toBeNull()
    expect(screen.queryByText('De Ayer')).toBeNull()
  })

  it('consulta list_shop_reservations por estado (NUNCA la tabla)', async () => {
    setupMockClient({ ready_pickup: [row()], confirmed: [] })
    render(<TodayPickups shopId="shop-a" />, { wrapper: createWrapper() })
    await screen.findByText('Cliente A')
    expect(rpc).toHaveBeenCalledWith('list_shop_reservations', {
      p_shop_id: 'shop-a',
      p_status: 'ready_pickup',
      p_limit: 100,
    })
    expect(rpc).toHaveBeenCalledWith('list_shop_reservations', {
      p_shop_id: 'shop-a',
      p_status: 'confirmed',
      p_limit: 100,
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('muestra el estado vacío cuando no hay recogidas para hoy', async () => {
    setupMockClient({
      ready_pickup: [],
      confirmed: [
        row({
          reservation_id: 'r-2',
          status: 'confirmed',
          pickup_start_at: '2026-07-16T15:00:00-04:00',
          pickup_end_at: '2026-07-16T18:00:00-04:00',
        }),
      ],
    })
    render(<TodayPickups shopId="shop-a" />, { wrapper: createWrapper() })
    expect(await screen.findByText('No hay recogidas para hoy')).toBeTruthy()
  })

  it('no expone el código ni botones por tarjeta (el código es de un solo uso, 0031)', async () => {
    setupMockClient({ ready_pickup: [row()], confirmed: [] })
    const { container } = render(<TodayPickups shopId="shop-a" />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Cliente A')).toBeTruthy())
    expect(container.textContent).not.toMatch(/P4P-/)
    expect(container.querySelectorAll('button').length).toBe(0)
  })
})
