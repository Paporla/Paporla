'use client';

import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, CreditCardIcon, MapPinIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

const steps = [
  { icon: MagnifyingGlassIcon, title: 'Explora', description: 'Busca packs cerca de ti' },
  { icon: CreditCardIcon, title: 'Reserva', description: 'Reserva tu pack favorito' },
  { icon: MapPinIcon, title: 'Recoge', description: 'Muestra tu código y recoge' },
  { icon: FaceSmileIcon, title: 'Disfruta', description: 'Comida que ayudó al planeta' },
];

export default function HowItWorksSection() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 group hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-white font-semibold text-lg">Cómo funciona</h2>
        </div>
        
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="flex items-center gap-4 group/item"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-all">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs font-bold">{idx + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}