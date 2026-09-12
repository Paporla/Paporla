import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Mis Packs (comercio) — lote 5 de avisos globales + L-34.
 *
 * Dos cosas se fijan aquí:
 *  1. El resultado de una ACCIÓN (publicar, pausar, eliminar) llega del hook y
 *     se sirve como aviso global UNA sola vez, aunque el efecto se repita.
 *  2. El fallo de CARGA del listado NO es un aviso pasajero: se queda escrito
 *     en la página con botón de reintentar, y mientras dura no se muestran ni
 *     las cifras (serían ceros de mentira) ni los vacíos ("no tienes packs").
 */

const hookState = vi.hoisted(() => ({
  loading: false,
  error: '',
  loadError: '',
  success: '',
  searchTerm: '',
  packs: [] as unknown[],
  stats: { total: 0, active: 0, paused: 0, draft: 0, inactive: 0, lowStock: 0 },
  updatingPackId: null as string | null,
  archivingPackId: null as string | null,
}))

const setError = vi.hoisted(() => vi.fn())
const setSuccess = vi.hoisted(() => vi.fn())
const setSearchTerm = vi.hoisted(() => vi.fn())
const reload = vi.hoisted(() => vi.fn())
const changePackState = vi.hoisted(() => vi.fn())
const archivePack = vi.hoisted(() => vi.fn())

vi.mock('@/components/business/packs/useBusinessPacks', () => ({
  useBusinessPacks: () => ({
    loading: hookState.loading,
    error: hookState.error,
    loadError: hookState.loadError,
    success: hookState.success,
    searchTerm: hookState.searchTerm,
    packs: hookState.packs,
    stats: hookState.stats,
    updatingPackId: hookState.updatingPackId,
    archivingPackId: hookState.archivingPackId,
    shopId: 'shop-1',
    setError,
    setSuccess,
    setSearchTerm,
    changePackState,
    archivePack,
    reload,
  }),
}))

import BusinessPacksPage from '@/app/(business)/business/packs/page'

function renderPage() {
  return render(
    <ToastProvider>
      <BusinessPacksPage />
    </ToastProvider>,
  )
}

beforeEach(() => {
  hookState.loading = false
  hookState.error = ''
  hookState.loadError = ''
  hookState.success = ''
  hookState.searchTerm = ''
  hookState.packs = []
  hookState.stats = { total: 0, active: 0, paused: 0, draft: 0, inactive: 0, lowStock: 0 }
  setError.mockClear()
  setSuccess.mockClear()
  setSearchTerm.mockClear()
  reload.mockClear()
  changePackState.mockClear()
  archivePack.mockClear()
})

describe('BusinessPacksPage (avisos globales y error de carga)', () => {
  it('éxito de una acción: aviso global y el estado del hook se limpia', () => {
    hookState.success = 'Pack publicado.'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Pack publicado.')
    // Se limpia para que el mismo mensaje pueda volver a avisar más tarde.
    expect(setSuccess).toHaveBeenCalledWith('')
  })

  it('error de una acción: aviso global de error y el estado del hook se limpia', () => {
    hookState.error = 'Pausa el pack antes de eliminarlo.'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Pausa el pack antes de eliminarlo.')
    expect(setError).toHaveBeenCalledWith('')
  })

  it('el aviso se sirve una sola vez: un re-render con el mismo mensaje no apila otro', () => {
    hookState.success = 'Pack pausado.'
    const { rerender } = renderPage()

    expect(screen.getAllByRole('alert')).toHaveLength(1)

    // Re-render con el hook devolviendo exactamente lo mismo (un cambio de
    // estado ajeno, p. ej. abrir el filtro): no debe apilarse un segundo aviso.
    // Esto es lo que rompería si el aviso se sirviera durante el render en vez
    // de en un efecto con dependencias.
    rerender(
      <ToastProvider>
        <BusinessPacksPage />
      </ToastProvider>,
    )
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('L-34 · fallo de carga: caja permanente con Reintentar, sin cifras ni vacíos mentirosos', () => {
    hookState.loadError = 'No se pudo conectar con el servidor'
    renderPage()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus packs')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor')

    // Mientras dura el fallo no se afirma que no haya packs.
    expect(screen.queryByText('No tienes packs creados')).toBeNull()
    expect(screen.queryByText('Total packs')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('sin fallos: cifras visibles, vacío honesto y ningún aviso', () => {
    renderPage()

    expect(screen.getByText('Total packs')).toBeDefined()
    expect(screen.getByText('No tienes packs creados')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('con packs cargados y sin fallo, la página sigue pintando sus grupos', () => {
    hookState.packs = [
      {
        id: 'p-1',
        title: 'Pack Pan Artesanal',
        description: null,
        status: 'active',
        is_active: true,
        remaining_stock: 5,
        total_stock: 10,
        price_minor: 3990,
        currency_code: 'CLP',
        ends_at: null,
      },
      {
        id: 'p-2',
        title: 'Pack Bollería Ayer',
        description: null,
        status: 'paused',
        is_active: false,
        remaining_stock: 2,
        total_stock: 8,
        price_minor: 2990,
        currency_code: 'CLP',
        ends_at: null,
      },
    ]
    hookState.stats = { total: 2, active: 1, paused: 1, draft: 0, inactive: 1, lowStock: 0 }
    renderPage()

    expect(screen.getByText('Packs publicados')).toBeDefined()
    expect(screen.getByText('Pack Pan Artesanal')).toBeDefined()
    // El grupo de historial existe pero arranca PLEGADO (solo el de publicados
    // lleva defaultExpanded), así que el título de dentro no está en el DOM
    // hasta desplegarlo. Comportamiento existente, no parte de este cambio.
    expect(screen.getByText('Historial')).toBeDefined()
    expect(screen.queryByText('Pack Bollería Ayer')).toBeNull()
  })
})
