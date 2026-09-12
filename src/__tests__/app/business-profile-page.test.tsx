import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Perfil del comercio (`business/profile`): guarda el perfil y los horarios en
 * las RPC `update_own_shop` / `create_own_shop` + `set_shop_hour`.
 *
 * Los tests fijan tres cosas:
 * (1) F2b — si el par de coordenadas es inválido, el guardado no toca la base y
 *     dice POR QUÉ (y al crear el comercio las coordenadas no se tiran, bug real:
 *     la página nunca las mandaba a `create_own_shop`, que sí las aceptaba);
 * (2) L-37 — si `get_my_shop` falla, la página NO enseña el formulario vacío:
 *     pinta una caja fija con Reintentar. Con el formulario vacío, `shop.id` no
 *     existe y al guardar se llamaría a `create_own_shop` en vez de
 *     `update_own_shop` (riesgo de duplicar el comercio);
 * (3) lote 8 — los avisos de acción los sirve el camarero global (`useToast`),
 *     no el `<Toast>` local que vivía al final del JSX.
 */

const mockRpc = vi.hoisted(() => vi.fn())

// User con identidad ESTABLE: el efecto de la página depende de [user], y si
// el mock fabricara un objeto nuevo en cada render, el efecto se re-ejecutaría
// en bucle infinito.
const mockUser = vi.hoisted(() => ({ id: 'owner-1', displayName: 'Owner Test' }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({ rpc: mockRpc }),
}))

import { ToastProvider } from '@/components/ui/ToastProvider'
import BusinessProfilePage from '@/app/(business)/business/profile/page'

const shopRow = {
  id: 's-1',
  name: 'Panadería Staging A centro',
  description: null,
  category: null,
  address_line1: 'Calle 59a',
  phone_e164: null,
  website_url: null,
  instagram_handle: null,
  latitude: -33.4489,
  longitude: -70.6693,
  logo_path: null,
  cover_path: null,
  default_pack_image_path: null,
  status: 'verified',
  status_reason: null,
}

/** Comercio cargado con normalidad: lo que devuelve la RPC cuando todo va bien. */
function rpcOk() {
  mockRpc.mockImplementation((name: string) => {
    if (name === 'get_my_shop') return Promise.resolve({ data: { shop: shopRow, hours: [] }, error: null })
    return Promise.resolve({ data: null, error: null })
  })
}

/** `get_my_shop` falla: el resto de RPC no llega a llamarse. */
function rpcLoadFails() {
  mockRpc.mockImplementation((name: string) => {
    if (name === 'get_my_shop') return Promise.resolve({ data: null, error: { message: 'red caída' } })
    return Promise.resolve({ data: null, error: null })
  })
}

// Lote 8: los avisos los sirve el ToastProvider global, así que los tests
// envuelven la página igual que providers.tsx.
function renderPage() {
  return render(
    <ToastProvider>
      <BusinessProfilePage />
    </ToastProvider>,
  )
}

beforeEach(() => {
  mockRpc.mockReset()
})

describe('BusinessProfilePage (ubicación)', () => {
  it('F2b: coordenadas inválidas no llaman al RPC y dicen por qué', async () => {
    rpcOk()

    renderPage()
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_my_shop'))

    // Pestaña Ubicación → latitud fuera de rango.
    fireEvent.click(screen.getByText('Ubicación'))
    fireEvent.change(screen.getByPlaceholderText('10.4961'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    // El mensaje aparece DOS veces: la caja roja del formulario (ya visible
    // al tipear el 999, sin guardar) y el aviso del intento de guardado.
    await waitFor(() => {
      expect(screen.getAllByText('La latitud debe estar entre -90 y 90.')).toHaveLength(2)
    })
    expect(mockRpc).not.toHaveBeenCalledWith('update_own_shop', expect.anything())
    expect(mockRpc).not.toHaveBeenCalledWith('set_shop_hour', expect.anything())
  })

  it('al crear el comercio, las coordenadas válidas del formulario no se tiran', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_my_shop') return Promise.resolve({ data: { shop: null, hours: [] }, error: null })
      if (name === 'create_own_shop')
        return Promise.resolve({ data: { shop_id: 's-nueva', success: true }, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    renderPage()
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_my_shop'))

    // "Información" es la pestaña por defecto: nombre. Después, par válido.
    fireEvent.change(screen.getByPlaceholderText('Mi Restaurante'), {
      target: { value: 'Panadería Nueva' },
    })
    fireEvent.click(screen.getByText('Ubicación'))
    fireEvent.change(screen.getByPlaceholderText('10.4961'), { target: { value: '-33.4489' } })
    fireEvent.change(screen.getByPlaceholderText('-66.8983'), { target: { value: '-70.6693' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith(
        'create_own_shop',
        expect.objectContaining({
          p_name: 'Panadería Nueva',
          p_latitude: -33.4489,
          p_longitude: -70.6693,
        }),
      ),
    )
  })
})

describe('BusinessProfilePage (L-37 · fallo de carga)', () => {
  it('si get_my_shop falla, NO se enseña el formulario vacío: caja fija con Reintentar', async () => {
    rpcLoadFails()

    renderPage()

    // La caja está escrita y se queda: no es un aviso de 4 segundos.
    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByText('No pudimos cargar tu comercio')).toBeDefined()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeDefined()

    // Y lo importante: el formulario NO está. Si estuviera, el dueño vería su
    // comercio en blanco y al guardar se llamaría a `create_own_shop`.
    expect(screen.queryByPlaceholderText('Mi Restaurante')).toBeNull()
    expect(screen.queryByRole('button', { name: /Guardar cambios/ })).toBeNull()
    expect(mockRpc).not.toHaveBeenCalledWith('create_own_shop', expect.anything())
    expect(mockRpc).not.toHaveBeenCalledWith('update_own_shop', expect.anything())

    // Un solo `alert` en pantalla: el fallo de carga no se duplica como aviso.
    expect(screen.queryAllByRole('alert')).toHaveLength(1)
  })

  it('Reintentar vuelve a leer y, si ya funciona, enseña el formulario con los datos', async () => {
    rpcLoadFails()

    renderPage()
    await screen.findByRole('alert')
    const primerasLlamadas = mockRpc.mock.calls.filter((c) => c[0] === 'get_my_shop').length
    expect(primerasLlamadas).toBe(1)

    // Ahora la red responde.
    rpcOk()
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))

    await waitFor(() => {
      const llamadas = mockRpc.mock.calls.filter((c) => c[0] === 'get_my_shop').length
      expect(llamadas).toBe(2)
    })

    // La caja se va y el formulario vuelve con el nombre real del comercio.
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect((screen.getByPlaceholderText('Mi Restaurante') as HTMLInputElement).value).toBe('Panadería Staging A centro')
  })
})

describe('BusinessProfilePage (lote 8 · avisos globales)', () => {
  it('guardar bien sirve el aviso desde el camarero global', async () => {
    rpcOk()

    renderPage()
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_my_shop'))

    fireEvent.change(screen.getByPlaceholderText('Mi Restaurante'), {
      target: { value: 'Panadería Staging A centro v2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('update_own_shop', expect.anything()))
    expect(await screen.findByText('Perfil y horarios actualizados')).toBeDefined()
  })

  it('descartar los cambios avisa desde el camarero global', async () => {
    rpcOk()

    renderPage()
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_my_shop'))

    fireEvent.change(screen.getByPlaceholderText('Mi Restaurante'), {
      target: { value: 'algo sin guardar' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }))

    expect(await screen.findByText('Cambios descartados')).toBeDefined()
    // El campo vuelve a lo que había en la base.
    expect((screen.getByPlaceholderText('Mi Restaurante') as HTMLInputElement).value).toBe('Panadería Staging A centro')
  })
})
