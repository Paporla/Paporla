import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PacksPage from '@/app/(public)/packs/PacksPageClient'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Regresión de L-05 (reportado por el fundador el 2026-09-10): al teclear en
 * el buscador de Explorar packs, la página entera se sustituía por el
 * esqueleto de carga y el panel de filtros —con su texto— se desmontaba. Al
 * terminar la carga, la caja de búsqueda volvía a aparecer VACÍA.
 *
 * Estos tests fijan el comportamiento correcto: mientras la query de búsqueda
 * está en vuelo, el input conserva lo escrito (mismo nodo DOM, sin remontar)
 * y el esqueleto ocupa solo el área de resultados.
 */

vi.mock('@/lib/analytics/events', () => ({
  trackViewPackList: vi.fn(),
  trackClickReserve: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const PLACEHOLDER = 'Buscar packs por nombre o descripcion...'

let rpc: ReturnType<typeof vi.fn>
let pendingResolve: ((v: { data: unknown[]; error: null }) => void) | null

function setupSupabase() {
  pendingResolve = null
  rpc = vi
    .fn()
    // Carga inicial del catálogo: vacío y al instante.
    .mockResolvedValueOnce({ data: [], error: null })
    // Búsqueda debonceada: se queda EN VUELO para poder asserting el estado
    // de loading con el panel todavía montado.
    .mockImplementationOnce(
      () =>
        new Promise<{ data: unknown[]; error: null }>((resolve) => {
          pendingResolve = resolve
        }),
    )
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PacksPage />
    </QueryClientProvider>,
  )
}

describe('Explorar packs — el buscador sobrevive a la carga (L-05)', () => {
  beforeEach(() => {
    setupSupabase()
  })

  it('mientras la búsqueda está en vuelo, el input conserva el texto y no se remonta', async () => {
    renderPage()

    // Catálogo inicial cargado (vacío): aparece el empty state y el buscador.
    await waitFor(() => expect(screen.getByText(/preparando sus primeros packs/i)).toBeInTheDocument())
    const input = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement

    // Teclear dispara la query tras el debounce de 350 ms (timers reales).
    fireEvent.change(input, { target: { value: 'pan' } })
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2), { timeout: 3000 })

    // LA REGRESIÓN: con el bug, aquí el panel se había desmontado y este
    // getByPlaceholderText devolvía un NODO NUEVO con value ''.
    const inputDuranteCarga = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement
    expect(inputDuranteCarga).toBe(input) // mismo nodo: no hubo remontaje
    expect(inputDuranteCarga.value).toBe('pan')

    // El esqueleto ocupa solo el área de resultados.
    expect(screen.getByText(/buscando packs/i)).toBeInTheDocument()

    // Resolver la búsqueda: el texto SIGUE ahí y el empty state es el de búsqueda.
    await act(async () => {
      pendingResolve?.({ data: [], error: null })
    })
    await waitFor(() => expect(screen.getByText(/no encontramos/i)).toBeInTheDocument())
    expect((screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement).value).toBe('pan')
  })

  it('la búsqueda viaja a la RPC con el texto recortado', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/preparando sus primeros packs/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '  sushi  ' } })
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2), { timeout: 3000 })

    expect(rpc).toHaveBeenLastCalledWith('search_available_packs', expect.objectContaining({ p_query: 'sushi' }))
  })
})
