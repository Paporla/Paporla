'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function PageLoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  const [show, setShow] = useState(false);

  // Pequeño delay para evitar parpadeo si carga muy rápido
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
        <p className="text-gray-400 text-lg font-medium">{message}</p>
        <p className="text-gray-600 text-sm mt-1">Por favor espera</p>
      </div>
    </div>
  );
}