'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

/**
 * Toggle de tema claro/oscuro (paso 2 del light mode, Bloque B).
 *
 * El arranque de la app sigue fijo en dark (ThemeContext, hotfix 31-ago):
 * este boton es la unica puerta al modo claro mientras se completa el
 * barrido de estilos (paso 3). Cuando el claro este auditado, el paso 4
 * reactivara la preferencia del sistema/localStorage como arranque.
 *
 * Accesibilidad: aria-label dinamico + aria-pressed para lectores de
 * pantalla; el icono es decorativo (aria-hidden).
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={!isDark}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="p-2 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
    >
      {isDark ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
    </button>
  )
}
