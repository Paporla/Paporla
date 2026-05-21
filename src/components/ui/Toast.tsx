'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }

  const icons = {
    success: 'OK',
    error: 'X',
    info: 'i',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${colors[type]} text-white`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icons[type]}</span>
          <span>{message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}