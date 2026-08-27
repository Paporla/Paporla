import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotifications, Notification } from '@/hooks/useNotifications'
import { supabaseBrowser } from '@/lib/supabase/client'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

/** Fila canónica de `public.notifications` (0006), como la devolvería la base. */
function notifRow(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    user_id: 'user-a',
    category: 'reservation',
    type: 'new_reservation',
    title: 'Nueva reserva',
    body: 'Cliente A reservó un pack.',
    data: {},
    reservation_id: 'r-1',
    shop_id: null,
    pack_id: null,
    read_at: null,
    expires_at: null,
    created_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

interface Mocks {
  rpc: ReturnType<typeof vi.fn>
  from: ReturnType<typeof vi.fn>
  builder: Record<string, unknown>
}

/**
 * Cliente mock con lo que toca el hook:
 *  - from('notifications').select('*').eq(...).order(...) → thenable con las filas
 *  - rpc(name, args)
 *  - channel(...).on(...).subscribe() / removeChannel (realtime defensivo)
 */
function setupMockClient(
  rows: Notification[],
  queryError: { message: string; code?: string } | null = null,
  rpcErrors: Record<string, { message: string; code?: string }> = {},
): Mocks {
  const rpc = vi.fn((name: string) => {
    if (rpcErrors[name]) return Promise.resolve({ data: null, error: rpcErrors[name] })
    return Promise.resolve({ data: { success: true }, error: null })
  })
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: queryError }).then(resolve, reject),
  }
  const from = vi.fn(() => builder)
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(),
  }
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    from,
    rpc,
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve()),
  })
  return { rpc, from, builder }
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-a' } })
  })

  it('carga el inbox de la tabla `notifications` con el filtro de usuario (RLS hace el resto)', async () => {
    const { from, builder } = setupMockClient([notifRow()])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(from).toHaveBeenCalledWith('notifications')
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-a')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.current.notifications.map((n) => n.id)).toEqual(['n-1'])
  })

  it('lee los campos del esquema real (title/body), sin inventar los del esquema viejo', async () => {
    setupMockClient([notifRow({ title: 'Pack listo para recoger', body: 'Tu pack 12 está listo.' })])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notifications[0].title).toBe('Pack listo para recoger')
    expect(result.current.notifications[0].body).toBe('Tu pack 12 está listo.')
  })

  it('calcula "no leída" con read_at NULL (el esquema real no tiene is_read)', async () => {
    setupMockClient([notifRow(), notifRow({ id: 'n-2', read_at: '2026-08-26T10:00:00Z' })])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unreadCount).toBe(1)
  })

  it('markAsRead usa la RPC canónica mark_notification_read y no toca la tabla', async () => {
    const { rpc, from } = setupMockClient([notifRow()])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.markAsRead('n-1')
    })
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: 'n-1' })
    // Solo la carga inicial consultó la tabla: cero escrituras directas.
    expect(from).toHaveBeenCalledTimes(1)
    expect(result.current.unreadCount).toBe(0)
    expect(result.current.notifications[0].read_at).not.toBeNull()
  })

  it('markAllAsRead llama a la RPC por cada no leída', async () => {
    const { rpc } = setupMockClient([notifRow(), notifRow({ id: 'n-2' })])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.markAllAsRead()
    })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: 'n-1' })
    expect(rpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: 'n-2' })
    expect(result.current.unreadCount).toBe(0)
  })

  it('markAllAsRead sin no leídas no llama a la RPC', async () => {
    const { rpc } = setupMockClient([notifRow({ read_at: '2026-08-26T10:00:00Z' })])
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let ok = false
    await act(async () => {
      ok = await result.current.markAllAsRead()
    })
    expect(rpc).not.toHaveBeenCalled()
    expect(ok).toBe(true)
  })

  it('si la RPC falla, traduce el error y la fila sigue no leída', async () => {
    const { rpc } = setupMockClient([notifRow()], null, {
      mark_notification_read: { message: 'NOTIFICATION_NOT_FOUND', code: 'P0002' },
    })
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.markAsRead('n-1')
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('Esa notificación ya no existe.')
    expect(result.current.unreadCount).toBe(1)
  })

  it('sin usuario no consulta y se queda cargando', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { from } = setupMockClient([notifRow()])
    const { result } = renderHook(() => useNotifications())
    await new Promise((r) => setTimeout(r, 10))
    expect(from).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true)
  })
})
