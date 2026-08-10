'use client'

import { Download } from 'lucide-react'
import { exportToCSV } from '@/lib/utils/csv'
import Button from '@/components/ui/Button'

interface ExportCSVButtonProps {
  /** Datos a exportar */
  data: Record<string, string | number | null | undefined>[]
  /** Nombre base del archivo (se agrega fecha automáticamente) */
  filename: string
  /** Columnas opcionales: key del dato → etiqueta visible */
  columns?: { key: string; label: string }[]
  /** Texto del botón */
  label?: string
  /** Variante visual */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  /** Deshabilitado si no hay datos */
  disabled?: boolean
}

/**
 * Botón reutilizable para exportar datos a CSV.
 * Genera el archivo y lo descarga con un solo clic.
 * El nombre del archivo incluye la fecha actual.
 */
export default function ExportCSVButton({
  data,
  filename,
  columns,
  label = 'Exportar CSV',
  variant = 'outline',
  disabled,
}: ExportCSVButtonProps) {
  const handleExport = () => {
    const date = new Date().toISOString().split('T')[0]
    exportToCSV(data, `${filename}_${date}`, columns)
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      icon={<Download className="w-4 h-4" />}
    >
      {label}
    </Button>
  )
}
