'use client';

import { motion } from 'framer-motion';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}