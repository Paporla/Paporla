import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Lote UX (mentira temporal): mientras la consulta de notificaciones estaba
 * en vuelo, el dropdown de la campana decía "No hay notificaciones" — el
 * usuario dudaba del buzón justo cuando más rápido abría el panel. Estos
 * tests fijan las tres verdades: cargando (esqueleto), vacío honesto y fallo
 * que no se disfraza de buzón vacío.
 */

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

let resolveQuery: ((v: { data: unknown; error: unknown }) => void) | null

function setupSupabase() {
  resolveQuery = null
  const chain: Record<string, () => unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.order = () =>
    new Promise<{ data: unknown; error: unknown }>((resolve) => {
      resolveQuery = resolve
    })
  // El hook también abre un canal realtime (INSERT/UPDATE de mis filas):
  // cadena .on().on().subscribe() y removeChannel al desmontar.
  const channel: Record<string, () => unknown> = {}
  channel.on = () => channel
  channel.subscribe = () => channel
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    from: () => chain,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: () => channel,
    removeChannel: vi.fn().mockResolvedValue(undefined),
  })
}

const NOTIF = {
  id: 'n-1',
  user_id: 'user-1',
  category: 'reservation',
  type: 'reservation_confirmed',
  title: 'Tu reserva está confirmada',
  body: 'Pasa a recogerla entre las 18:00 y las 20:00',
  data: {},
  reservation_id: 'r-1',
  shop_id: null,
  pack_id: null,
  read_at: null,
  expires_at: null,
  created_at: '2026-09-10T12:00:00.000Z',
}

function renderDropdown() {
  return render(<NotificationDropdown onClose={vi.fn()} />)
}

describe('NotificationDropdown — el buzón no miente mientras carga', () => {
  beforeEach(() => {
    setupSupabase()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'user' } })
  })

  it('con la consulta en vuelo muestra el esqueleto, NO "No hay notificaciones"', async () => {
    renderDropdown()

    await waitFor(() => expect(screen.getByLabelText('Cargando notificaciones')).toBeInTheDocument())
    expect(screen.queryByText('No hay notificaciones')).not.toBeInTheDocument()
  })

  it('resuelta y vacía: ahora sí dice "No hay notificaciones"', async () => {
    renderDropdown()
    await waitFor(() => expect(screen.getByLabelText('Cargando notificaciones')).toBeInTheDocument())

    await act(async () => {
      resolveQuery?.({ data: [], error: null })
    })

    await waitFor(() => expect(screen.getByText('No hay notificaciones')).toBeInTheDocument())
  })

  it('resuelta con notificaciones: las muestra', async () => {
    renderDropdown()
    await waitFor(() => expect(screen.getByLabelText('Cargando notificaciones')).toBeInTheDocument())

    await act(async () => {
      resolveQuery?.({ data: [NOTIF], error: null })
    })

    await waitFor(() => expect(screen.getByText('Tu reserva está confirmada')).toBeInTheDocument())
  })

  it('fallo de consulta: no se disfraza de buzón vacío', async () => {
    renderDropdown()
    await waitFor(() => expect(screen.getByLabelText('Cargando notificaciones')).toBeInTheDocument())

    await act(async () => {
      resolveQuery?.({ data: null, error: { message: 'connection lost', code: '08006' } })
    })

    await waitFor(() => expect(screen.queryByLabelText('Cargando notificaciones')).not.toBeInTheDocument())
    expect(screen.queryByText('No hay notificaciones')).not.toBeInTheDocument()
    // translateDbError no conoce el código 08006 y devuelve el mensaje real
    // (mejor depurable que uno genérico): ese texto es el que se muestra.
    expect(screen.getByText('connection lost')).toBeInTheDocument()
  })
})
