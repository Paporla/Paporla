import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Pestaña "Ubicación" del perfil del comercio: guarda las coordenadas a la
 * RPC `update_own_shop` (o `create_own_shop` al crear). Los tests fijan dos
 * cosas: (1) F2b — si el par es inválido, el guardado no toca la base y dice
 * POR QUÉ; (2) al crear el comercio las coordenadas no se tiran en silencio
 * (bug real: la página nunca las mandaba a create_own_shop, que sí las
 * aceptaba desde 0009:1285).
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

beforeEach(() => {
  mockRpc.mockReset()
})

describe('BusinessProfilePage (ubicación)', () => {
  it('F2b: coordenadas inválidas no llaman al RPC y dicen por qué', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_my_shop') return Promise.resolve({ data: { shop: shopRow, hours: [] }, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    render(<BusinessProfilePage />)
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('get_my_shop'))

    // Pestaña Ubicación → latitud fuera de rango.
    fireEvent.click(screen.getByText('Ubicación'))
    fireEvent.change(screen.getByPlaceholderText('10.4961'), { target: { value: '999' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    // El mensaje aparece DOS veces: la caja roja del formulario (ya visible
    // al tipear el 999, sin guardar) y el toast del intento de guardado.
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

    render(<BusinessProfilePage />)
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
