import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePublicPacks } from '@/hooks/usePublicPacks'

// ============================================================================
// El filtro por ciudad, de "escrito a mano" a "viene de la base de datos"
// ============================================================================
// Antes el desplegable ofrecía `cities = ['Santiago']` a mano, y el filtro se
// aplicaba en el navegador comparando nombres sobre los 50 packs que devolvía
// el límite. Dos problemas:
//
//   1. Una comuna nueva no aparecía en el desplegable salvo que alguien se
//      acordara de venir a añadirla al código.
//   2. Con más de 50 packs, filtrar por ciudad podía dar CERO resultados
//      aunque en esa ciudad sí hubiera packs. Y fallaba en silencio.
//
// Ahora la lista se lee de `localities` y la ciudad se manda a la RPC como
// p_locality_id, que es lo que la RPC ya aceptaba y nadie le pasaba.
//
// Como siempre: estos tests se comprueban rompiendo el código a propósito.
// ============================================================================

const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    rpc: mock.rpc,
    from: mock.from,
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  }),
}))

vi.mock('@/lib/analytics/events', () => ({
  trackViewPackList: vi.fn(),
  trackClickReserve: vi.fn(),
}))

const LOCALIDADES = [
  { id: 'loc-santiago', name: 'Santiago' },
  { id: 'loc-valparaiso', name: 'Valparaíso' },
  { id: 'loc-concepcion', name: 'Concepción' },
]

/**
 * Reproduce la cadena que arma useLocalities:
 *   from().select().eq().eq().order().order()  →  awaiteada
 */
function cadenaLocalidades(filas: unknown[]) {
  // Cuidado con no pasarse de niveles: hay exactamente DOS .order(), así que
  // el segundo tiene que devolver la promesa. Con uno de más, el await recibe
  // un objeto sin resolver, `data` queda undefined y la lista sale vacía —
  // que es exactamente lo que me pasó la primera vez.
  const resultado = Promise.resolve({ data: filas, error: null })
  const primerOrder = { order: () => resultado }
  const segundoEq = { order: () => primerOrder }
  const primerEq = { eq: () => segundoEq }
  const select = { eq: () => primerEq }
  return { select: () => select }
}

function envolver() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  mock.rpc.mockReset()
  mock.from.mockReset()
  mock.rpc.mockResolvedValue({ data: [], error: null })
  mock.from.mockImplementation((tabla: string) => {
    if (tabla === 'localities') return cadenaLocalidades(LOCALIDADES)
    throw new Error(`Tabla inesperada en el test: ${tabla}`)
  })
})

describe('usePublicPacks · filtro por localidad', () => {
  it('carga las localidades desde la base de datos', async () => {
    const { result } = renderHook(() => usePublicPacks(), { wrapper: envolver() })

    await waitFor(() => {
      expect(result.current.localities).toHaveLength(3)
    })
    expect(result.current.localities.map((l) => l.name)).toEqual(['Santiago', 'Valparaíso', 'Concepción'])
  })

  it('sin ciudad seleccionada no se manda p_locality_id', async () => {
    renderHook(() => usePublicPacks(), { wrapper: envolver() })

    await waitFor(() => expect(mock.rpc).toHaveBeenCalled())
    expect(mock.rpc.mock.calls[0][1]).toMatchObject({ p_locality_id: undefined })
  })

  it('CON ciudad seleccionada se manda el id de esa localidad', async () => {
    const { result, rerender } = renderHook(() => usePublicPacks(), { wrapper: envolver() })

    // Esperar a que las localidades lleguen, si no el nombre no encuentra id.
    await waitFor(() => expect(result.current.localities).toHaveLength(3))

    await rerender()
    result.current.setFilters((f) => ({ ...f, city: 'Valparaíso' }))

    await waitFor(() => {
      const ultima = mock.rpc.mock.calls[mock.rpc.mock.calls.length - 1]
      expect(ultima[1]).toMatchObject({ p_locality_id: 'loc-valparaiso' })
    })
  })

  it('una ciudad que ya no existe NO filtra: enseña todo en vez de cero', async () => {
    // Si el nombre no encuentra id, preferimos enseñar todos los packs. Un
    // catálogo sin filtrar es un fallo mucho mejor que uno vacío: el usuario
    // ve que hay cosas y puede quitar el filtro.
    const { result, rerender } = renderHook(() => usePublicPacks(), { wrapper: envolver() })

    await waitFor(() => expect(result.current.localities).toHaveLength(3))

    await rerender()
    result.current.setFilters((f) => ({ ...f, city: 'Ciudad Fantasma' }))

    await waitFor(() => {
      const ultima = mock.rpc.mock.calls[mock.rpc.mock.calls.length - 1]
      expect(ultima[1]).toMatchObject({ p_locality_id: undefined })
    })
  })

  it('la ciudad forma parte de la clave de la query (si no, no se repite la consulta)', async () => {
    // Si p_locality_id no estuviera en el queryKey, cambiar de ciudad no
    // volvería a consultar y se verían los packs de la ciudad anterior.
    const { result, rerender } = renderHook(() => usePublicPacks(), { wrapper: envolver() })

    await waitFor(() => expect(result.current.localities).toHaveLength(3))
    const antes = mock.rpc.mock.calls.length

    await rerender()
    result.current.setFilters((f) => ({ ...f, city: 'Concepción' }))

    await waitFor(() => {
      const ultima = mock.rpc.mock.calls[mock.rpc.mock.calls.length - 1]
      expect(ultima[0]).toBe('search_available_packs')
      expect(ultima[1]).toMatchObject({ p_locality_id: 'loc-concepcion' })
    })
    expect(mock.rpc.mock.calls.length).toBeGreaterThan(antes)
  })
})
