import { cache } from 'react'

/**
 * A-09: memoización por petición.
 *
 * `cache` de React recuerda el resultado de una función async durante UNA
 * petición: si dos sitios del mismo render (layout + página, o los metadatos
 * + el cuerpo) piden lo mismo, la base se consulta una sola vez.
 *
 * Trampa: `cache` NO existe en todas partes. Vive en el canal `react-server`
 * que usa Next al renderizar; en el paquete `react` plano —que es el que
 * resuelve vitest— es `undefined`. Importarlo no falla, pero LLAMARLO sí:
 * `TypeError: cache is not a function`, y como el módulo se carga al
 * importar, revienta cualquier test que toque esa ruta.
 *
 * Por eso este envoltorio: usa `cache` cuando de verdad está disponible y se
 * degrada a "sin memoria" cuando no. En producción deduplica; en los tests
 * se comporta igual que antes y ninguna aserción cambia.
 */
export function requestCache<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
  return typeof cache === 'function' ? (cache(fn) as (...args: Args) => Promise<R>) : fn
}
