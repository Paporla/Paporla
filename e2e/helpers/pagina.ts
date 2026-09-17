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
 * A-53 / A-33: el banner de cookies.
 *
 * `CookieConsentBanner.tsx` se pinta en `fixed bottom-0 inset-x-0 z-[90]`,
 * encima de todo. En la ficha del pack tapa justo el botón de "Reservar", asi
 * que el flujo de reserva falla con un clic que Playwright no puede hacer.
 * Y el `storageState` de `auth.setup.ts` no incluia la decisión de cookies,
 * asi que el banner volvia a salir en cada test autenticado.
 *
 * La solución no es perseguir el banner a clics (es una carrera: aparece
 * animado y a veces después del primer render). Es decidir ANTES de que la
 * página cargue, escribiendo en localStorage con `addInitScript`, que se
 * ejecuta en cada navegación antes de correr el JavaScript de la app.
 *
 * Se elige 'rejected'("Solo esenciales") a propósito: es la opción honesta
 * por defecto y, de paso, los tests no cargan GTM/GA4, asi que van más rápido
 * y sin ruido de red de analítica.
 *
 * La forma del valor es la que espera `src/lib/utils/cookieConsent.ts`:
 * `{ version: '1', value, decidedAt }`. Si un día cambia CONSENT_VERSION hay
 * que cambiarlo aquí también.
 */
const CONSENT_KEY = 'paporla-cookie-consent'
const CONSENT_VERSION = '1'

/** Contextos a los que ya se les ha inyectado el consentimiento. */
const yaPreparados = new WeakSet<object>()

export async function prepararConsentimiento(page: Page): Promise<void> {
  if (yaPreparados.has(page)) return
  yaPreparados.add(page)

  await page.addInitScript(
    ({ key, version }) => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version, value: 'rejected', decidedAt: new Date().toISOString() }),
        )
      } catch {
        // localStorage bloqueado: el banner volverá a salir. No es motivo
        // para reventar el test aquí; si tapa un botón, el fallo lo dirá.
      }
    },
    { key: CONSENT_KEY, version: CONSENT_VERSION },
  )
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

  // El banner de cookies se decide antes de cargar, no después (ver arriba).
  await prepararConsentimiento(page)

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

/**
 * Vigila las respuestas de una RPC de Supabase y devuelve una función que
 * cuenta qué falló, si falló algo.
 *
 * Por qué hace falta: la interfaz muestra un mensaje genérico ("No pudimos
 * cargar el catálogo") y hace BIEN — enseñarle a un cliente el error en crudo
 * de la base de datos no le ayuda en nada. Pero ese mensaje tampoco le dice
 * nada a quien lo depura: no distingue un permiso denegado de una función que
 * no existe o de un argumento inválido.
 *
 * Esto recoge el cuerpo real de la respuesta para que, cuando el catálogo
 * falle, el propio test cuente el motivo en vez de repetir el mensaje bonito.
 *
 * Hay que llamarlo ANTES de navegar: una respuesta que ya llegó no se puede
 * vigilar después.
 */
export function vigilarRpc(page: Page, nombreRpc: string): () => string {
  const partes: string[] = []

  // Se registra TODO lo que pasa por la API REST de Supabase, no solo la RPC
  // que nos interesa. Si el listener no ve ni una sola llamada, eso ya es un
  // dato: significa que el fallo ocurre ANTES de llegar a la red.
  const esDeSupabase = (url: string) => url.includes('/rest/v1/')

  page.on('response', (respuesta) => {
    if (!esDeSupabase(respuesta.url())) return
    const cual = respuesta.url().split('/rest/v1/')[1] ?? respuesta.url()
    void respuesta
      .text()
      .then((cuerpo) => {
        const trozo = cuerpo.replace(/\s+/g, ' ').trim().slice(0, 200)
        partes.push(`[${cual}] HTTP ${respuesta.status()} -> ${trozo || '(cuerpo vacío)'}`)
      })
      .catch(() => {
        partes.push(`[${cual}] HTTP ${respuesta.status()} (cuerpo ilegible)`)
      })
  })

  // Peticiones que ni siquiera llegaron a tener respuesta.
  page.on('requestfailed', (peticion) => {
    if (!esDeSupabase(peticion.url())) return
    const cual = peticion.url().split('/rest/v1/')[1] ?? peticion.url()
    partes.push(`[${cual}] PETICION FALLIDA: ${peticion.failure()?.errorText ?? 'sin detalle'}`)
  })

  // Errores de consola: aqui cae cualquier aviso del cliente de Supabase.
  page.on('console', (mensaje) => {
    if (mensaje.type() !== 'error') return
    partes.push(`[consola] ${mensaje.text().slice(0, 200)}`)
  })

  return () => (partes.length > 0 ? partes.join(' | ') : `SIN NINGUNA LLAMADA A /rest/v1/ (${nombreRpc})`)
}
