'use client'

import { motion } from 'framer-motion'
import { Package, Leaf } from 'lucide-react'

interface UserWelcomeBannerProps {
  userName: string
  packsRescued?: number
  co2SavedKg?: number
}

export default function UserWelcomeBanner({ userName, packsRescued = 0, co2SavedKg = 0 }: UserWelcomeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Panel de Control</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-gray-900">
            Hola, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm mt-1">
            Has rescatado <span className="text-primary font-bold">{packsRescued}</span> packs. ¡Sigue salvando comida!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl dark:bg-black/40 bg-gray-100 backdrop-blur-sm border dark:border-white/10 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white text-gray-900">{packsRescued}</p>
              <p className="text-[10px] dark:text-gray-500 text-gray-400">Packs salvados</p>
            </div>
          </div>

          {/* A-73: aquí antes iban unos "puntos" y un "nivel" (Aprendiz,
              Rescatador Elite...) que se calculaban al vuelo, no se guardaban
              en ninguna parte y no daban derecho a nada. Se sustituyen por el
              CO₂ evitado, que sale de los packs reales del usuario. */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl dark:bg-black/40 bg-gray-100 backdrop-blur-sm border dark:border-white/10 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white text-gray-900">{co2SavedKg}</p>
              <p className="text-[10px] dark:text-gray-500 text-gray-400">kg CO₂ evitado</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
