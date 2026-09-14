import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * El middleware de rutas: quién puede entrar dónde y a dónde se le manda.
 *
 * `middleware.ts` no tenía ni un test (los tres de esta carpeta cubren sus
 * ayudantes: CSP, CSRF y límite de peticiones). Aquí se prueba el bloque de
 * auth entero, incluida la mitad de L-29 que faltaba: cuando intentas entrar en
 * una página protegida sin sesión, el salto al login lleva `?redirect=` con la
 * ruta a la que ibas, para que al iniciar sesión vuelvas ahí y no al panel.
 *
 * El cliente de Supabase se simula: no se toca la red ni la base.
 */

const mockGetUser = vi.hoisted(() => vi.fn())
const mockMaybeSingle = vi.hoisted(() => vi.fn())

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }),
  }),
}))

import { middleware } from '../../../middleware'

const ORIGIN = 'https://preview.paporla.test'

async function run(path: string) {
  const res = await middleware(new NextRequest(`${ORIGIN}${path}`))
  const location = res.headers.get('location')
  return { res, location, url: location ? new URL(location) : null }
}

/** Perfil activo en la base, que es la única fuente de autorización válida. */
function profile(role: string, accountStatus = 'active') {
  mockMaybeSingle.mockResolvedValue({ data: { role, account_status: accountStatus }, error: null })
}

describe('middleware — rutas protegidas sin sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('manda al login diciéndole a dónde ibas (L-29)', async () => {
    const { res, url } = await run('/dashboard')

    expect(res.status).toBe(302)
    expect(url?.pathname).toBe('/login')
    expect(url?.searchParams.get('redirect')).toBe('/dashboard')
  })

  it('el destino conserva la query: se vuelve exactamente a donde estabas', async () => {
    const { url } = await run('/business/packs?tab=borradores&orden=recientes')

    expect(url?.searchParams.get('redirect')).toBe('/business/packs?tab=borradores&orden=recientes')
  })

  it.each(['/profile', '/notifications', '/favorites', '/reservations', '/business', '/admin'])(
    'todas las rutas protegidas llevan su redirect: %s',
    async (path) => {
      const { url } = await run(path)
      expect(url?.pathname).toBe('/login')
      expect(url?.searchParams.get('redirect')).toBe(path)
    },
  )

  it('las fichas de pack son públicas: no se salta al login (el caso del fundador era un corazón)', async () => {
    // El favorito se pide desde una página pública, así que quien no tiene
    // sesión no acaba aquí: le manda al login el propio botón. Se asienta para
    // que nadie "proteja" /packs por error y se cargue el catálogo.
    const { url } = await run('/packs/11111111-1111-4111-8111-111111111111')
    expect(url).toBeNull()
  })

  it('un redirect ajeno en la ruta protegida no cuela: el destino es la ruta real', async () => {
    // Si se respetara el que viene, cualquiera podría colar un destino externo
    // (/dashboard?redirect=https://sitio-malo). Se manda siempre la ruta que se
    // intentó abrir, y además queda un único parámetro redirect.
    const { url } = await run('/dashboard?redirect=https%3A%2F%2Fsitio-malo.example')

    expect(url?.pathname).toBe('/login')
    expect(url?.searchParams.getAll('redirect')).toHaveLength(1)
    expect(url?.searchParams.get('redirect')).toBe('/dashboard?redirect=https%3A%2F%2Fsitio-malo.example')
    expect(url?.searchParams.get('redirect')).not.toContain('https://sitio-malo')
  })

  it('los parámetros de la ruta protegida viajan DENTRO del redirect, no sueltos', async () => {
    // Sueltos acabarían duplicados: useAuth reexpide los parámetros del login al
    // destino y saldría /business/packs?estado=nuevo?estado=nuevo.
    const { url } = await run('/business/packs?estado=nuevo')

    expect(url?.searchParams.get('redirect')).toBe('/business/packs?estado=nuevo')
    expect(url?.searchParams.getAll('estado')).toHaveLength(0)
  })

  it('no es un 307: el salto no se queda en la caché del navegador', async () => {
    const { res } = await run('/dashboard')
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(308)
  })

  it('el login y el registro sin sesión se sirven, no redirigen', async () => {
    const { res, location } = await run('/login')
    expect(location).toBeNull()
    expect(res.status).toBe(200)

    const registro = await run('/register')
    expect(registro.location).toBeNull()
  })

  it('una ruta pública no llega ni a preguntar por la sesión', async () => {
    const { location } = await run('/')
    expect(location).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})

describe('middleware — con sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('usuario en su panel: pasa sin salto y con su CSP', async () => {
    profile('user')
    const { res, location } = await run('/dashboard')

    expect(location).toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Security-Policy')).toContain('nonce-')
  })

  it.each([
    ['user', '/dashboard', null],
    ['comercio', '/business', null],
    ['admin', '/admin', null],
    ['super_admin', '/admin', null],
  ])('%s en %s se queda donde está', async (role, path, expected) => {
    profile(role)
    const { url } = await run(path)
    expect(url?.pathname ?? null).toBe(expected)
  })

  it.each([
    ['comercio', '/dashboard', '/business'],
    ['user', '/business', '/dashboard'],
    ['user', '/admin', '/dashboard'],
    ['comercio', '/admin', '/business'],
    ['admin', '/business', null],
  ])('%s en %s acaba en %s', async (role, path, expected) => {
    profile(role)
    const { url } = await run(path)
    expect(url?.pathname ?? null).toBe(expected)
  })

  it('con sesión, entrar en /login te lleva a tu casa (nada de quedarse en el formulario)', async () => {
    profile('comercio')
    const { url } = await run('/login')
    expect(url?.pathname).toBe('/business')
  })

  it('cuenta suspendida: al login con el motivo, no a la página protegida', async () => {
    profile('user', 'suspended')
    const { url } = await run('/dashboard')

    expect(url?.pathname).toBe('/login')
    expect(url?.searchParams.get('error')).toBe('account_unavailable')
    // Sin redirect: no tiene sentido volver a una página a la que no puede entrar.
    expect(url?.searchParams.get('redirect')).toBeNull()
  })

  it('sesión viva pero sin perfil en la base: mismo trato que la cuenta no disponible', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { url } = await run('/business')

    expect(url?.pathname).toBe('/login')
    expect(url?.searchParams.get('error')).toBe('account_unavailable')
  })

  it('el rol de la sesión no manda: solo cuenta el perfil de la base', async () => {
    // user_metadata la puede editar el propio usuario; si el middleware la
    // mirara, cualquiera se haría admin. Aquí el perfil dice 'user'.
    profile('user')
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u-1', user_metadata: { role: 'super_admin' } } },
      error: null,
    })

    const { url } = await run('/admin')
    expect(url?.pathname).toBe('/dashboard')
  })
})
