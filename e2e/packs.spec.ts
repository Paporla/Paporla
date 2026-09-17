import { test, expect } from '@playwright/test'
import { visitarSana, sinErrorDeCarga } from './helpers/pagina'

/**
 * A-15: antes el unico assert era que el <body> era visible.
 *
 * Ojo con la diferencia importante: que NO haya packs es un estado válido
 * (los empty states de Paporla son honestos y lo dicen), pero que la página
 * este en blanco o muestre el estado de error NO lo es. Este test distingue
 * las dos cosas.
 */
test.describe('Packs browsing', () => {
  test('el listado carga y muestra su titular', async ({ page }) => {
    await visitarSana(page, '/packs', { titulo: /Packs Disponibles/ })
    await sinErrorDeCarga(page)
  })

  test('si hay packs, cada tarjeta enlaza a su ficha', async ({ page }) => {
    await visitarSana(page, '/packs', { titulo: /Packs Disponibles/ })

    // OJO: el <h1> lo pinta PacksHeroSection de inmediato, pero los packs
    // llegan DESPUES, por fetch. Contar las tarjetas nada mas cargar el
    // titular daba cero siempre —y no porque no hubiera packs, sino por una
    // carrera. Antes de contar hay que esperar a que el catalogo se resuelva:
    // o sale el skeleton de "Buscando packs..." como muy tarde, o ya hay
    // tarjetas, o ya sale el estado vacio.
    const tarjetas = page.locator('a[href^="/packs/"]')
    const vacio = page.getByText(/No hay packs|No encontramos|No pudimos cargar/i)
    await expect(
      tarjetas.first().or(vacio.first()),
      'el catálogo no terminó de cargar: ni tarjetas ni estado vacío',
    ).toBeVisible({ timeout: 20000 })

    const cuantas = await tarjetas.count()

    if (cuantas === 0) {
      // Estado válido: no hay packs a la venta. Se dice, no se finge.
      await expect(page.getByText(/No hay packs/i).first()).toBeVisible()
      return
    }

    // Cada enlace debe apuntar a una ficha concreta, no a /packs a secas.
    for (let i = 0; i < Math.min(cuantas, 5); i++) {
      const href = await tarjetas.nth(i).getAttribute('href')
      expect(href, `la tarjeta ${i} no tiene un href válido`).toMatch(/^\/packs\/[a-z0-9-]+/i)
    }
  })
})
