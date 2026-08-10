'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
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
  addToast: (message: string, type?: ToastType) => void
}

// ─── Context ────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
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
    return { addToast: () => {} }
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
