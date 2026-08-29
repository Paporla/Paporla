/**
 * Escapa los caracteres especiales de HTML para incrustar valores dinámicos
 * (nombre del usuario, título del pack, comercio, dirección, código) en el
 * HTML de los emails.
 *
 * Un comercio puede poner HTML en el nombre de su comercio o pack. Sin este
 * escape, ese HTML se renderizaría dentro del email de OTRA persona: phishing
 * con la marca Paporla (falsos botones, enlaces a dominio malicioso, imágenes
 * trackeables).
 *
 * El reemplazo va en UNA sola pasada sobre la clase completa de caracteres,
 * así '&' no se escapa dos veces (un 'Tom & Jerry' real queda 'Tom &amp; Jerry',
 * no '&amp;amp;').
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}
