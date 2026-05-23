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
    error: { icon: AlertCircle, color: 'bg-red-500/20 border-red-500/40 text-red-400', iconColor: 'text-red-400' },
    success: {
      icon: CheckCircle,
      color: 'bg-green-500/20 border-green-500/40 text-green-400',
      iconColor: 'text-green-400',
    },
    info: { icon: Info, color: 'bg-blue-500/20 border-blue-500/40 text-blue-400', iconColor: 'text-blue-400' },
  }

  const { icon: Icon, color, iconColor } = config[type]

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, y: -20, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -20, x: '-50%' }}
        className={`fixed top-24 left-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${color}`}
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
