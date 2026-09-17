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

    const tarjetas = page.locator('a[href^="/packs/"]')
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
