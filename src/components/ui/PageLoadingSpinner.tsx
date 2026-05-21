'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function PageLoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  const [show, setShow] = useState(false);

  // Pequeno delay para evitar parpadeo si carga muy rapido
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="dark:text-gray-400 text-gray-600 text-lg font-medium">{message}</p>
        <p className="dark:text-gray-600 text-gray-400 text-sm mt-1">Por favor espera</p>
      </div>
    </div>
  );
}