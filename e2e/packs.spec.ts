import { test, expect, type Page } from '@playwright/test'
import { visitarSana, sinErrorDeCarga, vigilarRpc } from './helpers/pagina'

/**
 * A-15: antes el unico assert era que el <body> era visible.
 *
 * Ojo con la diferencia importante: que NO haya packs es un estado válido
 * (los empty states de Paporla son honestos y lo dicen), pero que la página
 * este en blanco o muestre el estado de error NO lo es. Este test distingue
 * las dos cosas.
 *
 * 2026-09-17 (segunda correccion): el fallo que quedaba era mio por partida
 * doble.
 *
 *  1. Contaba las tarjetas nada mas aparecer el <h1>. Pero el <h1> lo pinta
 *     PacksHeroSection de inmediato y los packs llegan DESPUES, por fetch.
 *     Contaba cero por una carrera, no porque no hubiera packs.
 *
 *  2. Y el test del titular daba VERDE con el catálogo roto: comprobaba que
 *     no habia mensaje de error antes de que el error hubiera tenido tiempo
 *     de aparecer. Un test que se gana de velocidad al error no es un test.
 *
 * Ahora los dos esperan a que el catálogo se RESUELVA, y cuando algo no cuadra
 * el mensaje dice QUE hay en pantalla, no solo que no encontró lo que buscaba.
 */

/**
 * Espera a que el catálogo de /packs se resuelva y dice cómo quedó.
 *
 * Devuelve el número de tarjetas y, si en lugar de tarjetas hay un mensaje,
 * el texto de ese mensaje. Importa saber cuál es: "No hay packs" es un estado
 * válido, pero "No pudimos cargar el catálogo" es la aplicación fallando, y
 * los dos dejan la página sin tarjetas.
 */
/**
 * Vigila la llamada que alimenta el catálogo. Se registra antes de navegar,
 * porque una respuesta que ya llegó no se puede vigilar después.
 *
 * La interfaz tapa el error real con un mensaje amable (y hace bien), así que
 * sin esto el test solo podría repetir "No pudimos cargar el catálogo", que no
 * dice ni qué falló ni por qué.
 */
function vigilarCatalogo(page: Page): () => string {
  return vigilarRpc(page, 'search_available_packs')
}

async function esperarCatalogo(page: Page): Promise<{ cuantas: number; aviso: string }> {
  const tarjetas = page.locator('a[href^="/packs/"]')
  const aviso = page.getByText(/No hay packs|No encontramos|No pudimos cargar/i).first()

  await expect(
    tarjetas.first().or(aviso),
    'el catálogo no terminó de cargar: ni salieron tarjetas ni salió ningún mensaje',
  ).toBeVisible({ timeout: 20000 })

  const hayAviso = (await aviso.count()) > 0
  return {
    cuantas: await tarjetas.count(),
    aviso: hayAviso ? ((await aviso.textContent()) ?? '').trim() : '',
  }
}

test.describe('Packs browsing', () => {
  test('el listado carga y muestra su titular', async ({ page }) => {
    const errorRpc = vigilarCatalogo(page)
    await visitarSana(page, '/packs', { titulo: /Packs Disponibles/ })

    // Sin esta espera el test se ganaba de velocidad al error: comprobaba
    // que no habia aviso de fallo antes de que el fetch hubiera terminado.
    const { aviso } = await esperarCatalogo(page)
    expect(
      `${aviso}${errorRpc() ? ` || ${errorRpc()}` : ''}`,
      'el catálogo no cargó. Arriba va el motivo real de la base de datos, no el mensaje amable de la interfaz.',
    ).not.toMatch(/no pudimos|algo fall/i)

    await sinErrorDeCarga(page)
  })

  test('si hay packs, cada tarjeta enlaza a su ficha', async ({ page }) => {
    const errorRpc = vigilarCatalogo(page)
    await visitarSana(page, '/packs', { titulo: /Packs Disponibles/ })

    const { cuantas, aviso } = await esperarCatalogo(page)

    if (cuantas === 0) {
      // Sin tarjetas tiene que haber un estado vacío HONESTO. Y hay que decir
      // cuál salió: que el catálogo esté vacío es válido, que no se pueda
      // cargar no lo es, y los dos dejan la página igual de vacía.
      expect(
        `${aviso}${errorRpc() ? ` || ${errorRpc()}` : ''}`,
        'la página no mostró packs y tampoco dijo por qué. Arriba va el mensaje y el motivo real.',
      ).toMatch(/no hay packs|no encontramos/i)
      return
    }

    // Cada enlace debe apuntar a una ficha concreta, no a /packs a secas.
    for (let i = 0; i < Math.min(cuantas, 5); i++) {
      const href = await page.locator('a[href^="/packs/"]').nth(i).getAttribute('href')
      expect(href, `la tarjeta ${i} no tiene un href válido`).toMatch(/^\/packs\/[a-z0-9-]+/i)
    }
  })
})
