'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = 'Copiar' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors group"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span>¡Copiado!</span>
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
            <span>{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}