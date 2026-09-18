import type { Metadata } from 'next'

/** El tipo del openGraph tal como lo define Next, sin importarlo aparte. */
type OpenGraph = NonNullable<Metadata['openGraph']>

/**
 * Canonical y Open Graph coherentes para cada página pública (paso 44).
 *
 * Por qué: sin canonical, cualquier parámetro que alguien pegue detrás de una
 * URL compartida (?utm_de_whatsapp, etc.) crea una segunda copia de la página
 * a ojos de Google. Con el canonical puesto, todas las copias apuntan a la
 * URL limpia. `metadataBase` del layout resuelve la ruta relativa a absoluta.
 *
 * No se aplica a las páginas legales a propósito: nadie las enlaza con
 * parámetros detrás y son archivos de 600-700 líneas; el riesgo de tocarlos
 * no compensa el beneficio.
 */
export function seo(ruta: string, extra: Metadata = {}): Metadata {
  const og = (extra.openGraph ?? {}) as OpenGraph
  return {
    ...extra,
    alternates: { canonical: ruta },
    openGraph: { ...og, url: ruta },
  }
}
