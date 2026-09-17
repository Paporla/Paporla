import { expect, type Page, type Locator } from '@playwright/test'

/**
 * A-15: `expect(page.locator('body')).toBeVisible()` da verde incluso con la
 * página rota. Un <body> existe en un 500, en un crash de React y en un estado
 * vacio: no demuestra absolutamente nada.
 *
 * "Pagina sana" aqui significa cuatro cosas comprobables:
 *   1. Next.js no ha montado su overlay rojo de error.
 *   2. Hay un <h1> visible y con texto (no vacio).
 *   3. Ese <h1> es el que esperamos, si lo sabemos.
 *   4. La página tiene contenido real, no esta en blanco.
 *
 * Nada de esto depende de que existan datos en la base.
 */

/** Overlay de error que monta Next.js en desarrollo cuando algo revienta. */
const OVERLAY_ERROR = 'nextjs-portal'

export interface OpcionesPaginaSana {
  /** Texto (o patrón) que debe tener el <h1>. */
  titulo?: RegExp
  /** Mínimo de caracteres de texto visible para no dar por buena una página vacia. */
  mínimoCaracteres?: number
  /** Milisegundos de espera para el <h1>. */
  timeout?: number
}

export async function paginaSana(page: Page, opciones: OpcionesPaginaSana = {}): Promise<Locator> {
  const { titulo, mínimoCaracteres = 80, timeout = 15000 } = opciones

  // 1. Nada de overlay de error. Si aparece, mejor fallar aqui que seguir.
  await expect(
    page.locator(OVERLAY_ERROR),
    'Next.js mostró su overlay de error: la página esta rota de verdad',
  ).toHaveCount(0, { timeout: 5000 })

  // 2. Un <h1> visible y con texto.
  const h1 = page.locator('h1').first()
  await expect(h1, 'la página no mostró ningún <h1>').toBeVisible({ timeout })
  const textoH1 = ((await h1.textContent()) ?? '').trim()
  expect(textoH1.length, 'el <h1> salió vacio').toBeGreaterThan(0)

  // 3. Y que sea el que toca, si lo sabemos.
  if (titulo) {
    expect(textoH1, `el <h1> decía "${textoH1}"`).toMatch(titulo)
  }

  // 4. Contenido real: una página en blanco también tiene <body>.
  const cuerpo = (await page.locator('body').innerText()).trim()
  expect(cuerpo.length, `la página salió practicamente en blanco (${cuerpo.length} caracteres)`).toBeGreaterThan(
    mínimoCaracteres,
  )

  return h1
}

/**
 * Los empty states de Paporla son honestos (L-22): distinguen "no hay nada"
 * de "algo fallo". Esta funcion falla si la página esta mostrando el estado
 * de FALLO, que es justo lo que un test de humo no debe dar por bueno.
 */
export async function sinErrorDeCarga(page: Page): Promise<void> {
  const avisoDeFallo = page.getByText(/no pudimos|algo fall|int.ntalo otra vez/i)
  await expect(avisoDeFallo, 'la página esta mostrando el estado de error, no datos').toHaveCount(0)
}

/** Devuelve el número de tarjetas de pack listadas en /packs. */
export async function contarPacks(page: Page): Promise<number> {
  return page.locator('a[href^="/packs/"]').count()
}
