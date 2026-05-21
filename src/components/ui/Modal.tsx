'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 dark:bg-black/70 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="dark:bg-gray-900 bg-white rounded-xl border dark:border-gray-700 border-gray-200 shadow-2xl">
              {title && (
                <div className="px-6 py-4 border-b dark:border-gray-700 border-gray-200">
                  <h2 className="text-xl font-bold dark:text-white text-gray-900">{title}</h2>
                </div>
              )}
              <div className="p-6">{children}</div>
              <div className="px-6 py-4 border-t dark:border-gray-700 border-gray-200 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}