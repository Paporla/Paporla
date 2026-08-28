import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: mockRpc }),
}))

describe('GET /api/stats (Fase 8, community_stats 0035)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a community_stats y mapea el jsonb canónico a CommunityStats', async () => {
    mockRpc.mockResolvedValue({
      data: {
        packs_rescued: 12,
        money_saved_minor: 39900,
        currency_code: 'CLP',
        active_shops: 2,
        active_packs: 5,
      },
      error: null,
    })

    const { GET } = await import('@/app/api/stats/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('community_stats')
    expect(body.success).toBe(true)
    expect(body.stats.packsRescued).toBe(12)
    expect(body.stats.moneySavedMinor).toBe(39900)
    expect(body.stats.currencyCode).toBe('CLP')
    expect(body.stats.activeShops).toBe(2)
    expect(body.stats.activePacks).toBe(5)
  })

  it('calcula el CO2 a 2.5 kg por pack rescatado', async () => {
    mockRpc.mockResolvedValue({
      data: {
        packs_rescued: 12,
        money_saved_minor: 0,
        currency_code: 'CLP',
        active_shops: 0,
        active_packs: 0,
      },
      error: null,
    })

    const { GET } = await import('@/app/api/stats/route')
    const response = await GET()
    const body = await response.json()

    expect(body.stats.co2SavedKg).toBe(30)
  })

  it('sin rescatados → ceros (la landing muestra el fallback de la FAO)', async () => {
    mockRpc.mockResolvedValue({
      data: {
        packs_rescued: 0,
        money_saved_minor: 0,
        currency_code: 'CLP',
        active_shops: 1,
        active_packs: 0,
      },
      error: null,
    })

    const { GET } = await import('@/app/api/stats/route')
    const response = await GET()
    const body = await response.json()

    expect(body.stats.packsRescued).toBe(0)
    expect(body.stats.moneySavedMinor).toBe(0)
    expect(body.stats.co2SavedKg).toBe(0)
  })

  it('maneja un resultado null con ceros y CLP por defecto', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('@/app/api/stats/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stats.packsRescued).toBe(0)
    expect(body.stats.currencyCode).toBe('CLP')
  })

  it('devuelve 500 cuando la RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('permission denied') })

    const { GET } = await import('@/app/api/stats/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
