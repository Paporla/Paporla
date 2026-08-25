import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MarketSelect from '@/components/dashboard/MarketSelect'

/**
 * MarketSelect pregunta a la tabla `markets` (filtro pilot/active que aplica
 * la base de datos en producción; aquí controlamos la respuesta) y notifica
 * la elección a la página, que es la que guarda por `update_own_profile`.
 */
interface MockMarketRow {
  id: string
  name: string
  country_code: string
  currency_code: string
}

let mockRows: MockMarketRow[] = []
let mockFetchError: unknown = null

const CL_MARKET = '10000000-0000-4000-8000-000000000001'
const AR_MARKET = '10000000-0000-4000-8000-000000000002'

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    from: (table: string) => {
      if (table !== 'markets') throw new Error(`Tabla inesperada en el test: ${table}`)
      const chain = {
        select: () => chain,
        in: () => chain,
        order: () => Promise.resolve({ data: mockRows, error: mockFetchError }),
      }
      return chain
    },
  }),
}))

function renderMarketSelect(props: { value: string | null } = { value: null }) {
  const onSelect = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MarketSelect value={props.value} onSelect={onSelect} />
    </QueryClientProvider>,
  )
  return { onSelect }
}

beforeEach(() => {
  mockRows = [
    { id: CL_MARKET, name: 'Chile', country_code: 'CL', currency_code: 'CLP' },
    { id: AR_MARKET, name: 'Argentina', country_code: 'AR', currency_code: 'ARS' },
  ]
  mockFetchError = null
})

describe('MarketSelect', () => {
  it('muestra los mercados disponibles con nombre, país y moneda', async () => {
    renderMarketSelect({ value: CL_MARKET })

    const select = await screen.findByRole('combobox', { name: 'Tu mercado' })
    expect(withinOption(select, 'Chile (CL) — CLP')).toBeDefined()
    expect(withinOption(select, 'Argentina (AR) — ARS')).toBeDefined()
    // El mercado actual queda preseleccionado.
    expect((select as HTMLSelectElement).value).toBe(CL_MARKET)
  })

  it('sin mercado elegido muestra la advertencia de que no puede reservar', async () => {
    renderMarketSelect({ value: null })

    await screen.findByRole('combobox', { name: 'Tu mercado' })
    expect(screen.getByText('Aún no has elegido tu mercado. Sin mercado no puedes reservar packs.')).toBeDefined()
  })

  it('con mercado elegido no muestra la advertencia', async () => {
    renderMarketSelect({ value: CL_MARKET })

    await screen.findByRole('combobox', { name: 'Tu mercado' })
    expect(screen.queryByText(/Aún no has elegido tu mercado/)).toBeNull()
  })

  it('al elegir un mercado distinto notifica a la página con su id', async () => {
    const { onSelect } = renderMarketSelect({ value: CL_MARKET })

    const select = await screen.findByRole('combobox', { name: 'Tu mercado' })
    fireEvent.change(select, { target: { value: AR_MARKET } })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(AR_MARKET)
  })

  it('no notifica si se "elige" el mercado ya seleccionado', async () => {
    const { onSelect } = renderMarketSelect({ value: CL_MARKET })

    const select = await screen.findByRole('combobox', { name: 'Tu mercado' })
    fireEvent.change(select, { target: { value: CL_MARKET } })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('si no carga los mercados muestra el error y permite reintentar', async () => {
    mockFetchError = { message: 'relation "markets" does not exist' }
    renderMarketSelect({ value: null })

    expect(await screen.findByText('No se pudieron cargar los mercados disponibles. Inténtalo de nuevo.')).toBeDefined()

    // El siguiente intento sí trae datos: aparece la lista.
    mockFetchError = null
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Tu mercado' })).toBeDefined())
  })

  it('sin mercados disponibles deja deshabilitado el selector', async () => {
    mockRows = []
    renderMarketSelect({ value: null })

    const select = await screen.findByRole('combobox', { name: 'Tu mercado' })
    expect(select).toBeDisabled()
  })
})

function withinOption(select: HTMLElement, text: string) {
  return Array.from(select.querySelectorAll('option')).find((option) => option.textContent === text)
}
