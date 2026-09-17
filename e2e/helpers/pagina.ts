import { expect, type Page, type Locator } from '@playwright/test'

/**
 * A-15: `expect(page.locator('body')).toBeVisible()` da verde incluso con la
 * página rota. Un <body> existe en un 500, en un crash de React y en un estado
 * vacio: no demuestra absolutamente nada.
 *
 * ---------------------------------------------------------------------------
 * CORRECCION 2026-09-17 (error encontrado en la primera ejecucion real)
 * ---------------------------------------------------------------------------
 * La version anterior de este helper detectaba "página rota" buscando el
 * elemento <nextjs-portal>, creyendo que era el overlay rojo de error.
 *
 * Estaba mal: en Next.js 16 <nextjs-portal> es el contenedor de las
 * HERRAMIENTAS DE DESARROLLO (el badge de la esquina inferior). Next.js lo
 * monta SIEMPRE en modo `dev`, exista o no un error. Resultado: las 13
 * páginas que llamaban a esta funcion "fallaban" sin estar rotas, mientras
 * los otros 10 tests — incluidos los de redireccion y el health de la API —
 * pasaban. La app estaba sana; la comprobacion era la que estaba rota.
 *
 * Ahora "página sana" se decide con tres señales que si son ciertas:
 *
 *   1. El servidor no devolvio un HTTP 500 (o la navegacion no respondio).
 *   2. No se lanzó ninguna excepcion de JavaScript sin capturar.
 *   3. Hay un <h1> visible y con texto, y la página tiene contenido real.
 *
 * Y cuando algo falla, el mensaje dice QUE fallo, no solo que fallo.
 *
 * Nota sobre `networkidle`: ya no se usa. En modo desarrollo Next.js mantiene
 * abierto el websocket de recarga en caliente, asi que la red nunca llega a
 * estar "idle" de forma fiable. Se espera un <h1> concreto, que es lo que
 * de verdad indica que la página pinto.
 */

export interface OpcionesPaginaSana {
  /** Texto (o patrón) que debe tener el <h1>. */
  titulo?: RegExp
  /** Mínimo de caracteres de texto visible para no dar por buena una página vacia. */
  mínimoCaracteres?: number
  /** Milisegundos de espera para el <h1>. */
  timeout?: number
}

interface ContextoComprobacion {
  /** Ruta que se visito, para que el mensaje de error diga cual era. */
  ruta?: string
  /** Estado HTTP de la respuesta, si la hubo. 0 = no se comprobo. */
  estado?: number
  /** Excepciones de JavaScript sin capturar registradas durante la carga. */
  excepciones?: string[]
}

/**
 * Navega a `ruta` y comprueba que la página esta sana.
 *
 * Es la forma recomendada: registra el escucha de excepciones ANTES de
 * navegar, porque un error que ya ocurrio no se puede detectar despues si
 * nadie estaba escuchando.
 */
export async function visitarSana(page: Page, ruta: string, opciones: OpcionesPaginaSana = {}): Promise<Locator> {
  const { timeout = 15000 } = opciones

  const excepciones: string[] = []
  const alReventar = (error: Error) => excepciones.push(error.message.split('\n')[0])
  page.on('pageerror', alReventar)

  let estado = 0

  try {
    const respuesta = await page.goto(ruta, { waitUntil: 'domcontentloaded', timeout })
    estado = respuesta?.status() ?? 0
    return await nucleoSano(page, opciones, { ruta, estado, excepciones })
  } finally {
    page.off('pageerror', alReventar)
  }
}

/**
 * Comprueba que la página en la que ya estamos esta sana. Para usar despues
 * de una navegacion por clic, donde no controlamos el `goto`.
 */
export async function paginaSana(page: Page, opciones: OpcionesPaginaSana = {}): Promise<Locator> {
  return nucleoSano(page, opciones, {})
}

async function nucleoSano(page: Page, opciones: OpcionesPaginaSana, contexto: ContextoComprobacion): Promise<Locator> {
  const { titulo, mínimoCaracteres = 80, timeout = 15000 } = opciones
  const { ruta = 'la página actual', estado = 0, excepciones = [] } = contexto

  // 1. El servidor no devolvio un error de servidor.
  if (estado > 0) {
    expect(estado, `el servidor devolvió HTTP ${estado} en ${ruta}`).toBeLessThan(500)
  }

  // 2. Un <h1> visible y con texto. Si la página no pinta, no hay <h1>.
  const h1 = page.locator('h1').first()
  await expect(h1, `${ruta} no mostró ningún <h1>`).toBeVisible({ timeout })
  const textoH1 = ((await h1.textContent()) ?? '').trim()
  expect(textoH1.length, 'el <h1> salió vacio').toBeGreaterThan(0)

  // 3. Y que sea el que toca, si lo sabemos.
  if (titulo) {
    expect(textoH1, `el <h1> decía "${textoH1}"`).toMatch(titulo)
  }

  // 4. Contenido real: una página en blanco también tiene <body>.
  const cuerpo = (await page.locator('body').innerText()).trim()
  expect(cuerpo.length, `${ruta} salió practicamente en blanco (${cuerpo.length} caracteres)`).toBeGreaterThan(
    mínimoCaracteres,
  )

  // 5. Ninguna excepcion sin capturar. Se comprueba al final para que tambien
  //    cuenten los errores de hidratacion, que llegan despues del primer
  //    renderizado.
  if (excepciones.length > 0) {
    expect(excepciones, `${ruta} lanzó ${excepciones.length} excepción(es) sin capturar`).toEqual([])
  }

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
