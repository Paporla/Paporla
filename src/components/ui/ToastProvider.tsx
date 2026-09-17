'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toasts: ToastMessage[]
  // durationMs opcional: por defecto 4 s, pero un mensaje largo puede pedir
  // más tiempo de lectura sin obligar a montar un cartel local.
  addToast: (message: string, type?: ToastType, durationMs?: number) => void
  removeToast: (id: string) => void
}

// ─── Context ────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  /*
   * Cada aviso agenda un temporizador de 4 s para retirarse. Se apuntan todos
   * para cancelarlos si el provider se desmonta antes.
   *
   * Sin esto, al cerrar sesion o cambiar de layout a los pocos segundos de
   * saltar un aviso, el temporizador disparaba igual y llamaba a setToasts
   * sobre un componente que ya no estaba montado. No se veia nada en pantalla,
   * pero era trabajo muerto y, en los tests, una fuente de errores
   * intermitentes: el temporizador saltaba despues de que Vitest desmontara el
   * entorno del fichero y aparecia un "window is not defined" que no señalaba
   * a este componente sino a quien hubiera pedido el ultimo aviso.
   */
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const pendientes = temporizadores.current
    return () => {
      pendientes.forEach(clearTimeout)
      pendientes.length = 0
    }
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', durationMs = 4000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])

    const temporizador = setTimeout(() => {
      const i = temporizadores.current.indexOf(temporizador)
      if (i !== -1) temporizadores.current.splice(i, 1)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
    temporizadores.current.push(temporizador)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// ─── Hook público ───────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback silencioso: si no hay provider, addToast no hace nada
    return { toasts: [], addToast: () => {}, removeToast: () => {} }
  }
  return ctx
}

// ─── Config visual ──────────────────────────────────────

const toastConfig: Record<ToastType, { icon: typeof AlertCircle; color: string; iconColor: string }> = {
  error: {
    icon: AlertCircle,
    color: 'dark:bg-red-500/20 bg-red-50 dark:border-red-500/40 border-red-300 dark:text-red-400 text-red-700',
    iconColor: 'dark:text-red-400 text-red-600',
  },
  success: {
    icon: CheckCircle,
    color:
      'dark:bg-green-500/20 bg-green-50 dark:border-green-500/40 border-green-300 dark:text-green-400 text-green-700',
    iconColor: 'dark:text-green-400 text-green-600',
  },
  info: {
    icon: Info,
    color: 'dark:bg-primary/20 bg-green-50 dark:border-primary/40 border-green-300 dark:text-primary text-green-700',
    iconColor: 'dark:text-primary text-green-600',
  },
}

// ─── Contenedor de toasts ───────────────────────────────

function ToastContainer({ toasts, removeToast }: { toasts: ToastMessage[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon: Icon, color, iconColor } = toastConfig[toast.type]
          return (
            <motion.div
              key={toast.id}
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg max-w-sm ${color}`}
            >
              <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
