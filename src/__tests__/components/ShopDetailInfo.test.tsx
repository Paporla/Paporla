import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ShopDetailInfo from '@/components/shops/ShopDetailInfo'

/**
 * L-16 (mitad pública, Lote Escaparate commit C): la ficha PÚBLICA del comercio
 * por fin tiene el mapa de OpenStreetMap. Hasta ahora el embed solo vivía en
 * el formulario del dueño (ProfileLocationForm) y la ficha pública se quedaba
 * con el botón de Google Maps: lo verificado en Preview en su día era el
 * formulario, no la ficha. Estos tests amarran el iframe en su sitio nuevo.
 */

const shopConCoords = {
  id: 'shop-a',
  name: 'Panadería de pruebas',
  address: 'Calle 59a, Santiago',
  city: 'Santiago',
  phone: null,
  website: 'https://www.paporla.com/',
  instagram: 'nvargal',
  latitude: -33.45,
  longitude: -70.66,
  rating: 4.5,
  hours: null,
  created_at: '2026-09-01T00:00:00.000Z',
}

describe('ShopDetailInfo — mapa público de OpenStreetMap (L-16)', () => {
  it('con coordenadas: iframe de OSM con su marker y las coordenadas debajo', () => {
    render(<ShopDetailInfo shop={shopConCoords} packsCount={1} />)

    const mapa = screen.getByTitle('Mapa de ubicacion del comercio')
    expect(mapa.tagName.toLowerCase()).toBe('iframe')
    const src = mapa.getAttribute('src') ?? ''
    expect(src).toContain('openstreetmap.org/export/embed.html')
    expect(src).toContain('marker=-33.45,-70.66')
    // Las coordenadas se ven debajo, en plan dato, como en el formulario.
    expect(screen.getByText('-33.45000, -70.66000')).toBeTruthy()
  })

  it('el botón de Google Maps sigue ahí, con las coordenadas en el enlace', () => {
    render(<ShopDetailInfo shop={shopConCoords} packsCount={1} />)

    const enlace = screen.getByText('Ver en Google Maps').closest('a')
    expect(enlace?.getAttribute('href')).toContain('maps?q=-33.45,-70.66')
  })

  it('sin coordenadas: ni mapa ni botón, y no se inventa un mapa vacío', () => {
    render(<ShopDetailInfo shop={{ ...shopConCoords, latitude: null, longitude: null }} packsCount={1} />)

    expect(screen.queryByTitle('Mapa de ubicacion del comercio')).toBeNull()
    expect(screen.queryByText('Ver en Google Maps')).toBeNull()
  })
})

describe('ShopDetailInfo — "Miembro desde" sin fechas inventadas (L-44)', () => {
  it('con fecha real: se pinta el mes y el año', () => {
    render(<ShopDetailInfo shop={shopConCoords} packsCount={1} />)

    expect(screen.getByText(/Miembro desde septiembre de 2026/)).toBeTruthy()
  })

  it('sin fecha (get_public_shop no la trae): se oculta la línea, no se inventa "Recientemente"', () => {
    render(<ShopDetailInfo shop={{ ...shopConCoords, created_at: '' }} packsCount={1} />)

    expect(screen.queryByText(/Miembro desde/)).toBeNull()
    expect(screen.queryByText(/Recientemente/)).toBeNull()
  })
})
