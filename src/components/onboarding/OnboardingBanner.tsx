'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, MapPin, X } from 'lucide-react'
import { isUserOnboardingDismissed, dismissUserOnboarding } from '@/lib/utils/onboarding'

interface Step {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const userSteps: Step[] = [
  { icon: Search, title: 'Explora packs', description: 'Busca packs cerca de ti con descuentos de hasta 70%' },
  { icon: ShoppingBag, title: 'Reserva', description: 'Elige tu pack favorito y reserva en segundos' },
  { icon: MapPin, title: 'Recoge y disfruta', description: 'Ve al comercio, muestra tu código y recoge' },
]

interface Props {
  /** Nivel real del usuario ("Aprendiz", "Rescatador"...). Si no se pasa, se usa la palabra genérica. */
  level?: string
}

/**
 * Cartel informativo del USUARIO: la historia "explora → reserva → recoge".
 *
 * Desde el Lote E de simplificación este banner es solo de usuario: el
 * onboarding del comercio es el checklist «Primeros pasos» del panel, que
 * se deriva de datos vivos (la variante 'commerce' de aquí repetía esos
 * mismos pasos en genérico y competía con él).
 *
 * El descarte vive en un estado único compartido con OnboardingSteps del
 * catálogo (lib/utils/onboarding): entendida la historia en un sitio,
 * entendida en todos. Eso cierra el bug de la auditoría de las claves de
 * localStorage descoordinadas.
 */
export default function OnboardingBanner({ level }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isUserOnboardingDismissed()) {
      // Timer a 0: saca el setState del cuerpo del efecto (regla
      // react-hooks/set-state-in-effect) y deja pasar el primer pintado.
      const timer = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    dismissUserOnboarding()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-6"
        >
          {/* Blob decorativo */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />

          <div className="relative p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold dark:text-white text-gray-900">
                  ¡Bienvenido a Paporla! <span className="text-primary">{level ?? 'Rescatador'}</span>
                </h2>
                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                  Así funciona. En 3 pasos empiezas a rescatar comida y ahorrar.
                </p>
              </div>
              <button
                onClick={dismiss}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Cerrar onboarding"
              >
                <X className="w-4 h-4 dark:text-gray-500 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {userSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-primary/20 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium dark:text-white text-gray-900">{step.title}</p>
                    </div>
                    <p className="text-xs dark:text-gray-500 text-gray-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
