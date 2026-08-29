/**
 * Serializa un objeto para incrustarlo dentro de
 * <script type="application/ld+json">.
 *
 * JSON.stringify no escapa '</script>': si un valor que viene de la base
 * (título del pack, nombre del comercio) contiene esa secuencia, el tag se
 * cierra antes de tiempo y el resto del JSON se inyecta como HTML/JS en la
 * página. Escapar '<' como \u003c deja el JSON 100% válido (es una secuencia
 * de escape estándar de JSON) y el contenido, al parsearlo, es idéntico.
 */
export function jsonLdToScriptContent(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
