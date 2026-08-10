'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Cancelar reserva',
  cancelText = 'Volver',
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap + ESC key (paridad con Modal.tsx)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 dark:bg-black/80 bg-black/50 backdrop-blur-sm z-50"
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="dark:bg-gray-900 bg-white rounded-2xl border dark:border-gray-700 border-gray-200 shadow-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 dark:text-red-400 text-red-600" />
                </div>
                <h3 id="confirm-modal-title" className="text-xl font-semibold dark:text-white text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="dark:text-gray-400 text-gray-600 text-sm">{message}</p>
              </div>
              <div className="flex gap-3 p-4 pt-0">
                <Button onClick={onConfirm} variant="danger" className="flex-1">
                  {confirmText}
                </Button>
                <Button onClick={onClose} variant="outline" className="flex-1">
                  {cancelText}
                </Button>
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar diálogo"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
