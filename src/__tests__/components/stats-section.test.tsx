import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StatsSection from '@/components/landing/StatsSection'
import { apiFetch } from '@/lib/utils/api-client'

/**
 * Regla de negocio (decidida por el fundador, 2026-09-02): la landing solo
 * muestra los datos reales de la comunidad con al menos 10 comercios
 * verificados; por debajo, cuenta el problema global (FAO/Banco Mundial/ONU),
 * que es verdad siempre. Con 1 comercio y 4 packs, la cifra real transmite
 * "aquí no hay nadie".
 */

vi.mock('@/lib/utils/api-client', () => ({
  apiFetch: vi.fn(),
}))

const mockApiFetch = vi.mocked(apiFetch)

function statsResponse(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    stats: {
      packsRescued: 4,
      moneySavedMinor: 15960,
      co2SavedKg: 10,
      activeShops: 1,
      ...overrides,
    },
  }
}

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StatsSection />
    </QueryClientProvider>,
  )
}

describe('StatsSection (umbral de comunidad)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('con pocos comercios (piloto actual): muestra el problema global, no la comunidad', async () => {
    mockApiFetch.mockResolvedValue(statsResponse({ activeShops: 1 }))
    renderSection()

    expect(await screen.findByText(/escala masiva/)).toBeInTheDocument()
    expect(screen.getByText(/Datos de la FAO, Banco Mundial y Naciones Unidas/)).toBeInTheDocument()
    expect(screen.queryByText(/marcando la diferencia/)).not.toBeInTheDocument()
  })

  it('con 10+ comercios verificados y packs rescatados: muestra los datos reales', async () => {
    mockApiFetch.mockResolvedValue(statsResponse({ activeShops: 10, packsRescued: 120 }))
    renderSection()

    expect(await screen.findByText(/marcando la diferencia/)).toBeInTheDocument()
    expect(screen.getByText('Datos en tiempo real de Paporla')).toBeInTheDocument()
  })

  it('con 10+ comercios pero 0 packs: sigue el fallback (no hay nada que contar)', async () => {
    mockApiFetch.mockResolvedValue(statsResponse({ activeShops: 12, packsRescued: 0 }))
    renderSection()

    expect(await screen.findByText(/escala masiva/)).toBeInTheDocument()
  })

  it('si la API falla: fallback sin romper', async () => {
    mockApiFetch.mockRejectedValue(new Error('down'))
    renderSection()

    expect(await screen.findByText(/escala masiva/)).toBeInTheDocument()
  })
})
