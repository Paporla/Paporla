'use client'

import { AlertTriangle, RotateCw } from 'lucide-react'

interface AdminPanelErrorProps {
  title: string
  description: string
  onRetry?: () => void
}

/**
 * FASE 6.6 — Estado de error compartido por /admin y /admin/stats.
 *
 * Antes: si una consulta fallaba (o el request no respondía y no existía
 * timeout), la página se quedaba en el skeleton de carga para siempre sin
 * explicar nada. Ahora: mensaje claro + botón Reintentar, para que el
 * panel nunca deje al usuario colgado sin una salida (regla F2b).
 */
export default function AdminPanelError({ title, description, onRetry }: AdminPanelErrorProps) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center" role="alert">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold dark:text-white text-gray-900">{title}</h2>
      <p className="dark:text-gray-500 text-gray-500 text-sm mt-2 max-w-md mx-auto">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity"
        >
          <RotateCw className="w-4 h-4" aria-hidden />
          Reintentar
        </button>
      )}
    </div>
  )
}
