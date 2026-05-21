'use client';

import { motion } from 'framer-motion';

export default function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <motion.div
          className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="dark:text-gray-400 text-gray-600">{message}</p>
      </div>
    </div>
  );
}