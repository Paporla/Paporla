'use client';

import { Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnsavedChangesBarProps {
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}

export default function UnsavedChangesBar({ isDirty, onSave, onDiscard, saving }: UnsavedChangesBarProps) {
  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="sticky top-16 z-30 bg-primary/10 border border-primary/30 rounded-xl px-5 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary font-medium">Tienes cambios sin guardar</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onDiscard} className="text-xs text-gray-400 hover:text-white transition-colors">
              Descartar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-black text-sm font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}