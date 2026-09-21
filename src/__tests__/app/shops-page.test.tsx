import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShopsPage from '@/app/(public)/shops/page'

/**
 * L-42 (Lote Escaparate, commit B): los textos del directorio dicen la verdad.
 * Antes el contador ("N comercios disponibles") contaba solo comercios con
 * packs y el único estado vacío culpaba a los filtros aunque no hubiera ni
 * filtros ni comercios. Ahora hay DOS vacíos distintos (sin comercios / sin
 * coincidencias) y el contador separa "comercios en Paporla" de "con packs a
 * la venta ahora". El hook se mockea (su lógica vive en useShops.test) y la
 * tarjeta se stubbea: aquí se prueban textos y contadores, no la tarjeta.
 */

const shopsState = vi.hoisted(() => ({
  shops: [] as Array<Record<string, unknown>>,
  loading: false,
  error: null as string | null,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/shops',
}))

vi.mock('@/hooks/useShops', () => ({
  useShops: () => ({
    shops: shopsState.shops,
    loading: shopsState.loading,
    error: shopsState.error,
    reload: vi.fn(),
  }),
}))

vi.mock('@/components/shops/ShopCard', () => ({
  default: ({ shop }: { shop: { id: string; name: string; has_available_packs: boolean } }) => (
    <div data-testid="shop-card">
      {shop.name}
      {shop.has_available_packs ? ' [con packs]' : ' [sin packs]'}
    </div>
  ),
}))

function shop(id: string, withPacks: boolean) {
  return {
    id,
    name: `Comercio ${id}`,
    description: `Descripción de ${id}`,
    city: 'Santiago',
    logo_url: null,
    cover_url: null,
    rating: 4.5,
    verified: true,
    has_available_packs: withPacks,
    available_pack_count: withPacks ? 2 : 0,
  }
}

describe('shops page — contador y vacíos honestos (L-42)', () => {
  beforeEach(() => {
    shopsState.shops = []
    shopsState.loading = false
    shopsState.error = null
  })

  it('sin comercios: vacío de verdad, sin culpar a los filtros', () => {
    render(<ShopsPage />)

    expect(screen.getByText('Aún no hay comercios publicados en Paporla')).toBeTruthy()
    expect(screen.getByText(/Estamos sumando comercios al rescate/)).toBeTruthy()
    // El mensaje de filtros no debe aparecer: no hay nada que filtrar.
    expect(screen.queryByText(/Prueba con otro nombre u otra ciudad/)).toBeNull()
    // Y los filtros tampoco se pintan.
    expect(screen.queryByLabelText('Buscar comercios')).toBeNull()
  })

  it('contador: comercios en Paporla por un lado, con packs por otro', () => {
    shopsState.shops = [shop('s1', true), shop('s2', false)]

    const { container } = render(<ShopsPage />)

    // El contador vive partido en varios nodos (cifra en <span>, texto suelto):
    // se comprueba sobre el textContent completo del contenedor.
    expect(container.textContent).toContain('2 comercios en Paporla')
    expect(container.textContent).toContain('1 con packs a la venta ahora')
    expect(screen.getAllByTestId('shop-card')).toHaveLength(2)
    // El comercio sin packs aparece en la rejilla, no se esconde.
    expect(screen.getByText(/Comercio s2 \[sin packs\]/)).toBeTruthy()
  })

  it('con comercios pero sin packs a la venta: el contador no inventa el segundo dato', () => {
    shopsState.shops = [shop('s1', false)]

    const { container } = render(<ShopsPage />)

    expect(container.textContent).toContain('1 comercio en Paporla')
    expect(container.textContent).not.toContain('con packs a la venta ahora')
  })

  it('hay comercios pero la búsqueda los deja fuera: entonces sí, prueba con otros filtros', () => {
    shopsState.shops = [shop('s1', true)]

    render(<ShopsPage />)

    fireEvent.change(screen.getByLabelText('Buscar comercios'), { target: { value: 'zzz' } })

    expect(screen.getByText('Ningún comercio coincide con tu búsqueda')).toBeTruthy()
    expect(screen.getByText('Prueba con otro nombre u otra ciudad')).toBeTruthy()
    expect(screen.queryAllByTestId('shop-card')).toHaveLength(0)
  })
})
