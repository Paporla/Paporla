'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'error' | 'success' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const config = {
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
      color: 'dark:bg-blue-500/20 bg-blue-50 dark:border-blue-500/40 border-blue-300 dark:text-blue-400 text-blue-700',
      iconColor: 'dark:text-blue-400 text-blue-600',
    },
  }

  const { icon: Icon, color, iconColor } = config[type]

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-24 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${color}`}
      >
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
