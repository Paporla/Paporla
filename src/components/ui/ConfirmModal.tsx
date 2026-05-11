'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
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
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{message}</p>
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
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}