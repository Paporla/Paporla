'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, MapPin, Store, Package, Users, X } from 'lucide-react'

interface Step {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const userSteps: Step[] = [
  { icon: Search, title: 'Explora packs', description: 'Busca packs cerca de ti con descuentos de hasta 70%' },
  { icon: ShoppingBag, title: 'Reserva', description: 'Elige tu pack favorito y reserva en segundos' },
  { icon: MapPin, title: 'Recoge y disfruta', description: 'Ve al comercio, muestra tu codigo y recoge' },
]

const commerceSteps: Step[] = [
  { icon: Store, title: 'Completa tu perfil', description: 'Añade fotos, horarios y descripcion de tu comercio' },
  { icon: Package, title: 'Crea packs', description: 'Publica packs con los excedentes del dia a buen precio' },
  { icon: Users, title: 'Recibe reservas', description: 'Los usuarios reservan y recogen en tu horario' },
]

interface Props {
  type: 'user' | 'commerce'
  /** Nivel real del usuario ("Aprendiz", "Rescatador"...). Si no se pasa, se usa la palabra genérica. */
  level?: string
}

const STORAGE_KEY = 'paporla_onboarding_dismissed'

export default function OnboardingBanner({ type, level }: Props) {
  const [visible, setVisible] = useState(false)
  const steps = type === 'user' ? userSteps : commerceSteps

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
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
                  Bienvenido a Paporla!{' '}
                  <span className="text-primary">{type === 'user' ? (level ?? 'Rescatador') : 'Comercio'}</span>
                </h2>
                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                  {type === 'user'
                    ? 'Asi funciona. En 3 pasos empiezas a rescatar comida y ahorrar.'
                    : 'Sigue estos pasos para empezar a vender tus excedentes.'}
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
              {steps.map((step, i) => (
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
