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

/** Escapa un valor para CSV: comillas dobles y saltos de línea */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Descarga un string como archivo CSV.
 * @param content Contenido del archivo
 * @param filename Nombre del archivo (sin extensión)
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
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
