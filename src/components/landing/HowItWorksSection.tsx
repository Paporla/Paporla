'use client'

import { motion } from 'framer-motion'
import { Search, CreditCard, MapPin, Smile } from 'lucide-react'

const steps = [
  { icon: Search, title: 'Explora', description: 'Busca packs cerca de ti' },
  { icon: CreditCard, title: 'Reserva', description: 'Reserva tu pack favorito' },
  { icon: MapPin, title: 'Recoge', description: 'Muestra tu código y recoge' },
  { icon: Smile, title: 'Disfruta', description: 'Comida que ayudó al planeta' },
]

export default function HowItWorksSection() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="h-full"
    >
      <div className="h-full bg-gradient-to-br from-primary/[0.18] to-primary/[0.05] backdrop-blur-sm rounded-2xl p-8 border border-primary/20 group hover:border-primary/40 transition-all duration-300">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-8 bg-gradient-to-b from-primary to-primary/40 rounded-full" />
          <h2 className="dark:text-white text-gray-900 font-bold text-xl">Cómo funciona</h2>
        </div>

        <div className="relative">
          {/* Línea vertical conectora - más reforzada */}
          <div className="absolute left-[19px] top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/40 to-transparent shadow-lg shadow-primary/20" />
          {/* Puntos en la línea */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute left-[17.5px] w-[6px] h-[6px] rounded-full bg-primary/30"
              style={{ top: `${18 + i * 33}%` }}
            />
          ))}

          <div className="space-y-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.15 }}
                className="relative flex items-center group/item"
              >
                {/* Número de paso (izquierda) */}
                <div className="relative z-10">
                  <div className="relative w-10 h-10 rounded-full dark:bg-[#0a0a0f] bg-white shadow-inner border border-primary/30 flex items-center justify-center group-hover/item:scale-110 group-hover/item:shadow-lg group-hover/item:shadow-primary/30 transition-all duration-300">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10" />
                    <span className="relative z-10 text-primary font-bold text-base">{idx + 1}</span>
                  </div>
                </div>

                {/* Spacer flexible */}
                <div className="flex-1" />

                {/* Icono + Contenido (ancho fijo = mismo punto de partida) */}
                <div className="flex items-center gap-4 w-60">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/[0.12] to-primary/[0.04] flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 group-hover/item:-rotate-3 group-hover/item:shadow-lg transition-all duration-300">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white text-gray-900 text-base group-hover/item:text-primary transition-colors duration-300">
                      {step.title}
                    </p>
                    <p className="text-sm dark:text-gray-400 text-gray-500 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
