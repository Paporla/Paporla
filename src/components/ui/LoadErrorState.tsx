'use client'

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

/**
 * A-07: estado de FALLO DE CARGA, que no es lo mismo que estado vacío.
 *
 * Antes, cuando fallaba una consulta, tres pantallas caían al estado vacío:
 * favoritos decía "No tienes favoritos", notificaciones "Sin notificaciones" y
 * el directorio de comercios "Aún no hay comercios publicados". El usuario no
 * podía distinguir "no hay nada" de "no se pudo leer", y en el directorio eso
 * significaba que un visitante nuevo se iba pensando que Paporla estaba vacía.
 *
 * Dos afirmaciones muy distintas que la app trataba igual:
 *   - "no tenemos datos de ti"  -> legítimo, es un estado vacío
 *   - "no conseguí leerlos"     -> esto es un ERROR y hay que decirlo
 *
 * Este componente es la segunda. Se pinta ANTES que el estado vacío: si algo
 * falló, nunca se afirma que el usuario no tiene nada.
 *
 * El patrón es el que ya usa el panel (dashboard/page.tsx): se queda escrito
 * en la página, en vez de un aviso flotante que se autodestruye a los 4 s y
 * deja la pantalla en blanco sin explicación.
 */
interface LoadErrorStateProps {
  /** Qué es lo que no se pudo cargar. Ejemplo: "No pudimos cargar tus favoritos". */
  title: string
  /** Detalle técnico del error. Se muestra tal cual: ayuda a diagnosticar. */
  detail?: string | null
  /** Reintentar. Si no se pasa, no se pinta el botón. */
  onRetry?: () => void
  /** Variante reducida, para listas dentro de una página mayor. */
  compact?: boolean
}

export default function LoadErrorState({ title, detail, onRetry, compact }: LoadErrorStateProps) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        compact
          ? 'flex flex-col sm:flex-row items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4'
          : 'glass-card dark:border-red-500/30 border-red-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-3'
      }
    >
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="dark:text-white text-gray-900 font-medium text-sm">{title}</p>
        {detail && <p className="dark:text-gray-400 text-gray-600 text-xs mt-1">Detalle: {detail}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </motion.div>
  )
}
