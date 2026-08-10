'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, MapPin, X } from 'lucide-react'

const STORAGE_KEY = 'paporla_onboarding_seen'

export default function OnboardingSteps() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Solo mostrar si no se vio antes
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      // Pequeño delay para que no compita con la carga de página
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="relative mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
            {/* Botón cerrar */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold dark:text-white text-gray-900 mb-1">
                ¿Cómo funciona Paporla?
              </h3>
              <p className="text-sm dark:text-gray-400 text-gray-600">
                Rescata comida, ahorra dinero y ayuda al planeta en 3 pasos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Paso 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold dark:text-white text-gray-900 text-sm">Explora</h4>
                  </div>
                  <p className="text-xs dark:text-gray-400 text-gray-600">
                    Descubre packs sorpresa con descuento de comercios cerca de ti. Cada pack es excedente del día que
                    merece una segunda oportunidad.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold dark:text-white text-gray-900 text-sm">Reserva</h4>
                  </div>
                  <p className="text-xs dark:text-gray-400 text-gray-600">
                    Elige tu pack y resérvalo en segundos. Recibirás un código que presentarás al recoger tu pedido. Sin
                    vueltas, sin sorpresas.
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold dark:text-white text-gray-900 text-sm">Recoge</h4>
                  </div>
                  <p className="text-xs dark:text-gray-400 text-gray-600">
                    Ve al comercio en la hora indicada, muestra tu código y llévate tu pack. ¡Comida de calidad a mitad
                    de precio!
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={dismiss}
                className="px-6 py-2 rounded-xl bg-primary text-black font-medium text-sm hover:bg-primary/90 transition-all"
              >
                ¡Entendido, vamos a rescatar!
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
