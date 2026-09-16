import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * L-30 — el proveedor de sesión (`useAuth`) por fin con tests propios.
 *
 * Es el corazón del "quién eres y a dónde vas": lee la sesión al montar, busca
 * el perfil en `user_profiles`, cierra la sesión cuando el perfil no existe o la
 * cuenta no está activa, y decide el destino tras entrar. Ahí vive también el
 * mecanismo de L-29 ("vuelve a donde estabas"): si la URL trae `?redirect=`, se
 * valida con `getSafeInternalRedirect` y gana sobre el destino por rol.
 *
 * Nada de esto estaba cubierto: se comprobaba a mano en el Preview, que es una
 * red más floja. Los tests son de hook (renderHook con AuthProvider de wrapper)
 * y el cliente de Supabase se simula entero, así que no se toca la red.
 */

const mockReplace = vi.hoisted(() => vi.fn())
const mockRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { AuthProvider, useAuth } from '@/hooks/useAuth'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const MARKET_ID = '10000000-0000-4000-8000-000000000001'

/** Fila tal cual viene de la base (snake_case), antes de mapUserProfile. */
function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    role: 'user',
    account_status: 'active',
    email: 'usuario@example.com',
    display_name: 'Usuario Uno',
    phone_e164: '+56955551234',
    avatar_path: null,
    market_id: MARKET_ID,
    locality_id: null,
    locale: 'es-CL',
    onboarding_completed_at: null,
    email_confirmed_at: null,
    last_login_at: null,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  }
}

/**
 * Cliente de Supabase simulado. Por defecto: sin sesión y sin perfil, que es el
 * punto de partida más neutro; cada test sobrescribe lo que necesita.
 */
function buildClient() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/avatar.png' } })
  const unsubscribe = vi.fn()
  const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } })

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange,
    },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) })),
    storage: { from: () => ({ getPublicUrl }) },
  }

  vi.mocked(supabaseBrowser).mockReturnValue(client as never)
  return { client, maybeSingle, getPublicUrl, unsubscribe, onAuthStateChange }
}

/** Sesión iniciada a nivel de auth (lo que devuelve getSession/getUser). */
function withSession(mocks: ReturnType<typeof buildClient>, userId = USER_ID) {
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } })
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
}

function renderAuth() {
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  })
}

/** Cambia la URL del navegador simulado (de ahí se lee `?redirect=`). */
function setUrl(query: string) {
  window.history.replaceState({}, '', `/login${query}`)
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUrl('')
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  // ─── Carga inicial ────────────────────────────────────────

  it('sin sesión: usuario vacío, deja de cargar y se queda escuchando cambios de auth', async () => {
    const mocks = buildClient()
    const { result, unmount } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1)
    // Sin sesión no se busca perfil en la base.
    expect(mocks.client.from).not.toHaveBeenCalled()

    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalled()
  })

  it('con sesión y perfil: carga el usuario y resuelve la URL pública de su avatar', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ avatar_path: 'avatars/u1/a.png' }), error: null })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.user?.displayName).toBe('Usuario Uno')
    expect(result.current.user?.role).toBe('user')
    expect(result.current.user?.avatarPublicUrl).toBe('https://cdn.test/avatar.png')
    expect(result.current.loading).toBe(false)
    expect(mocks.client.from).toHaveBeenCalledWith('user_profiles')
  })

  it('sin foto de perfil: no se pide la URL pública y el avatar queda vacío', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.user?.avatarPublicUrl).toBeNull()
    expect(mocks.getPublicUrl).not.toHaveBeenCalled()
  })

  it('la sesión existe pero el usuario ya no: cierra la sesión para no seguir reintentando', async () => {
    const mocks = buildClient()
    mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: USER_ID } } } })
    mocks.client.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'User not found' } })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(mocks.client.auth.signOut).toHaveBeenCalled()
  })

  it('autenticado pero sin perfil: reintenta y, si no aparece, cierra la sesión', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderAuth()

    // Dos reintentos de 600 ms: el perfil lo crea un trigger de Auth y puede
    // llegar un pelín tarde. Si no llega, fuera sesión (nunca se inserta desde
    // el cliente).
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 4000 })
    expect(result.current.user).toBeNull()
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(3)
    expect(mocks.client.auth.signOut).toHaveBeenCalled()
  }, 10000)

  it('cuenta suspendida: cierra la sesión y no deja entrar', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ account_status: 'suspended' }), error: null })

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(mocks.client.auth.signOut).toHaveBeenCalled()
  })

  // ─── signIn ───────────────────────────────────────────────

  it('contraseña incorrecta: lanza el mensaje traducido y no navega a ningún sitio', async () => {
    const mocks = buildClient()
    // Supabase devuelve un AuthError, que es un Error de verdad: con un objeto
    // suelto translateAuthError no encontraría el mensaje (ver L-41).
    mocks.client.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: new Error('Invalid login credentials'),
    })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.signIn('usuario@example.com', 'mala')).rejects.toThrow(
        'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })

  it.each([
    ['user', '/dashboard'],
    ['comercio', '/business'],
    ['admin', '/admin'],
    ['super_admin', '/admin'],
  ])('sin ?redirect=: el rol %s entra en %s', async (role, target) => {
    const mocks = buildClient()
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ role }), error: null })
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('usuario@example.com', 'buena')
    })

    expect(mockReplace).toHaveBeenCalledWith(target)
    expect(result.current.user?.role).toBe(role)
    expect(result.current.error).toBeNull()
  })

  it('con ?redirect=: vuelve a donde estaba el usuario y conserva los demás parámetros', async () => {
    const mocks = buildClient()
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ role: 'comercio' }), error: null })
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    setUrl('?redirect=%2Fbusiness%2Fpacks&reserved=true')

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('comercio@example.com', 'buena')
    })

    // Gana el destino pedido sobre el que tocaría por rol (/business).
    expect(mockReplace).toHaveBeenCalledWith('/business/packs?reserved=true')
  })

  it('con ?redirect= a un sitio externo: se ignora y entra por rol (nada de saltos a otra web)', async () => {
    const mocks = buildClient()
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ role: 'user' }), error: null })
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    setUrl('?redirect=https%3A%2F%2Fotro-sitio.example%2Fphishing')

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('usuario@example.com', 'buena')
    })

    expect(mockReplace).toHaveBeenCalledWith('/dashboard')
  })

  it('entra pero su perfil no existe: cierra la sesión y lo dice claro', async () => {
    const mocks = buildClient()
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.signIn('usuario@example.com', 'buena')).rejects.toThrow(
        'No existe perfil para este usuario',
      )
    })

    expect(mocks.client.auth.signOut).toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('entra pero la cuenta está suspendida: cierra la sesión y no navega', async () => {
    const mocks = buildClient()
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ account_status: 'suspended' }), error: null })
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.signIn('usuario@example.com', 'buena')).rejects.toThrow(
        'La cuenta no está disponible',
      )
    })

    expect(mocks.client.auth.signOut).toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  // ─── signUp ───────────────────────────────────────────────

  it('registro pendiente de confirmar el correo: vuelve al login avisando y se guarda el destino', async () => {
    const mocks = buildClient()
    mocks.client.auth.signUp.mockResolvedValue({ data: { user: { id: USER_ID }, session: null }, error: null })
    setUrl('?redirect=%2Fdashboard%2Ffavorites')

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp('nuevo@example.com', 'clave-segura', 'Nuevo', 'user')
    })

    // Sin sesión no hay entrada automática: se le dice que confirme el correo y
    // el destino se conserva para después del enlace.
    expect(mockReplace).toHaveBeenCalledWith('/login?registered=true&redirect=%2Fdashboard%2Ffavorites')
  })

  it('registro sin destino guardado: vuelve al login solo con registered=true', async () => {
    const mocks = buildClient()
    mocks.client.auth.signUp.mockResolvedValue({ data: { user: { id: USER_ID }, session: null }, error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp('nuevo@example.com', 'clave-segura', 'Nuevo', 'user')
    })

    expect(mockReplace).toHaveBeenCalledWith('/login?registered=true')
  })

  it('el registro manda los datos que necesita el correo de bienvenida y la vuelta al /callback', async () => {
    const mocks = buildClient()
    mocks.client.auth.signUp.mockResolvedValue({ data: { user: { id: USER_ID }, session: null }, error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp(
        ' tienda@example.com',
        'clave-segura',
        '  Panadería Rosa  ',
        'comercio',
        '+56 9 5555 1234',
        {
          name: '  Panadería Rosa  ',
          city: 'Santiago',
        },
      )
    })

    const call = mocks.client.auth.signUp.mock.calls[0][0]
    expect(call.email).toBe(' tienda@example.com')
    expect(call.options.data.name).toBe('Panadería Rosa') // nombre recortado
    expect(call.options.data.role).toBe('comercio')
    expect(call.options.data.phone).toBe('+56955551234') // teléfono normalizado a E.164 (fuera espacios)
    expect(call.options.data.locale).toBe('es-CL')
    // Pre-onboarding del comercio: create_own_shop vuelve a validar todo esto.
    expect(call.options.data.shop_name).toBe('Panadería Rosa')
    expect(call.options.data.shop_city).toBe('Santiago')
    expect(call.options.emailRedirectTo).toContain('/callback')
  })

  it('teléfono sin formato internacional: se rechaza antes de llamar al servidor y con un ejemplo', async () => {
    const mocks = buildClient()

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(
        result.current.signUp('nuevo@example.com', 'clave-segura', 'Nuevo', 'user', '955551234'),
      ).rejects.toThrow('Ingresa el teléfono en formato internacional, por ejemplo +56955551234')
    })

    expect(mocks.client.auth.signUp).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('registro rechazado por el servidor: lanza el error tal cual (quien llama lo traduce)', async () => {
    const mocks = buildClient()
    mocks.client.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.signUp('nuevo@example.com', 'clave-segura', 'Nuevo', 'user')).rejects.toThrow(
        'User already registered',
      )
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('registro con sesión directa: entra y va a su casa por rol', async () => {
    const mocks = buildClient()
    mocks.client.auth.signUp.mockResolvedValue({
      data: { user: { id: USER_ID }, session: { user: { id: USER_ID } } },
      error: null,
    })
    mocks.maybeSingle.mockResolvedValue({ data: profileRow({ role: 'comercio' }), error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp('tienda@example.com', 'clave-segura', 'Panadería', 'comercio')
    })

    expect(mockReplace).toHaveBeenCalledWith('/business')
    expect(result.current.user?.displayName).toBe('Usuario Uno')
  })

  // ─── signOut ──────────────────────────────────────────────

  it('cerrar sesión: limpia el usuario, vuelve al inicio y refresca', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).not.toBeNull())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mocks.client.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
    expect(mockReplace).toHaveBeenCalledWith('/')
    expect(mockRefresh).toHaveBeenCalled()
  })

  // ─── Cambios de auth en caliente ──────────────────────────

  it('SIGNED_OUT en caliente: vacía el usuario y el error sin recargar', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).not.toBeNull())

    const onAuthChange = mocks.onAuthStateChange.mock.calls[0][0]
    act(() => onAuthChange('SIGNED_OUT'))

    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('SIGNED_IN una vez cargado: vuelve a leer el perfil (sin pantalla de carga de por medio)', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).not.toBeNull())

    mocks.client.auth.getSession.mockClear()
    const onAuthChange = mocks.onAuthStateChange.mock.calls[0][0]
    await act(async () => {
      onAuthChange('SIGNED_IN')
    })

    // getUser(true) = skipLoading: se refresca el perfil sin parpadear.
    await waitFor(() => expect(mocks.client.auth.getSession).toHaveBeenCalled())
    expect(result.current.loading).toBe(false)
  })

  // ─── Contrato del hook ────────────────────────────────────

  it('usar useAuth fuera del proveedor falla con un mensaje que dice qué hacer', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/debe usarse dentro de <AuthProvider>/)
  })
})

/**
 * A-11: el cliente de Supabase se recreaba en cada render.
 *
 * `supabaseBrowser()` llama a `createBrowserClient` cada vez, así que sin
 * `useMemo` el proveedor fabricaba un cliente NUEVO en cada render. Como
 * `fetchProfile` depende de él, `getUser` de `fetchProfile`, y el efecto de
 * la suscripción de sesión de `[getUser, supabase]`, las tres piezas cambiaban
 * de identidad en cada render y el efecto se re-ejecutaba entero: desuscribir,
 * resuscribir y volver a pedir el perfil. Sin parar, mientras el usuario
 * estuviera con la sesión abierta.
 */
describe('useAuth — el cliente se crea una sola vez (A-11)', () => {
  /**
   * Este es el que de verdad detecta el bug. Medido: sin `useMemo`, tres
   * repintados del proveedor fabricaban 5 clientes (1 del montaje, 1 del
   * repintado natural de la carga y 3 de los forzados). Con `useMemo`, 1.
   *
   * Ojo con cómo se fuerza el repintado: el `rerender()` de `renderHook`
   * sólo vuelve a pintar al consumidor del hook, NO al `AuthProvider` de
   * encima, que es donde se crea el cliente. Hay que repintar el wrapper.
   */
  it('repintar el proveedor no fabrica clientes de Supabase nuevos', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    let bump: () => void = () => {}
    function Wrapper({ children }: { children: ReactNode }) {
      const [n, setN] = useState(0)
      bump = () => setN(n + 1)
      return <AuthProvider>{children}</AuthProvider>
    }

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    await act(async () => {
      bump()
    })
    await act(async () => {
      bump()
    })
    await act(async () => {
      bump()
    })

    expect(vi.mocked(supabaseBrowser)).toHaveBeenCalledTimes(1)
  })

  /**
   * Invariante general de la suscripción, NO un detector de A-11: medido,
   * este test pasa también sin `useMemo`. Se queda porque vigila algo que
   * importa por sí mismo: que durante la carga no se desuscriba la sesión y
   * se vuelva a suscribir (entre una cosa y la otra hay un hueco en el que
   * un cierre de sesión o un token renovado se perdería).
   */
  it('al terminar la carga no se desuscribe ni se resuscribe la sesión', async () => {
    const mocks = buildClient()
    withSession(mocks)
    mocks.maybeSingle.mockResolvedValue({ data: profileRow(), error: null })

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).not.toBeNull())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Una sola suscripción para toda la vida del proveedor.
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })
})
