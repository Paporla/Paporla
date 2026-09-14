import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ShopDetailPacks from '@/components/shops/ShopDetailPacks'

/**
 * L-42 (Lote Escaparate commit C): el vacío de packs de la ficha pública dice
 * ahora la verdad completa: el comercio SIGUE en Paporla, lo que no hay hoy es
 * packs a la venta. Antes el mensaje ("No hay packs disponibles") dejaba en el
 * aire si el comercio seguía existiendo o no.
 */

describe('ShopDetailPacks — vacío honesto en la ficha pública (L-42)', () => {
  it('sin packs: nombra al comercio y deja claro que sigue en Paporla', () => {
    render(<ShopDetailPacks packs={[]} shopName="Panadería de pruebas" shopAddress="Calle 59a" />)

    expect(screen.getByText(/no hay packs a la venta en/)).toBeTruthy()
    expect(screen.getByText(/Panadería de pruebas/)).toBeTruthy()
    expect(screen.getByText(/El comercio sigue en Paporla/)).toBeTruthy()
  })

  it('el mensaje viejo, que no contaba nada, ya no está', () => {
    render(<ShopDetailPacks packs={[]} shopName="Panadería de pruebas" shopAddress="Calle 59a" />)

    expect(screen.queryByText('No hay packs disponibles')).toBeNull()
  })
})
