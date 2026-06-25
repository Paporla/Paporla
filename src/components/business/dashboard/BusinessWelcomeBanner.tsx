'use client'

import { motion } from 'framer-motion'
import { TrendingUp, CalendarCheck } from 'lucide-react'

interface BusinessWelcomeBannerProps {
  shopName: string
  todayReservations?: number
  weekGrowth?: number
}

export default function BusinessWelcomeBanner({
  shopName,
  todayReservations = 0,
  weekGrowth = 0,
}: BusinessWelcomeBannerProps) {
  const isPositive = weekGrowth >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Panel de Control</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-gray-900">
            Hola, <span className="text-primary">{shopName}</span>!
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm mt-1">Gestiona tus packs y haz crecer tu negocio.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl dark:bg-black/40 bg-white/80 backdrop-blur-sm dark:border-white/10 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold dark:text-white text-gray-900">{todayReservations}</p>
              <p className="text-[10px] dark:text-gray-500 text-gray-400">Reservas hoy</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl dark:bg-black/40 bg-white/80 backdrop-blur-sm dark:border-white/10 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}
                {weekGrowth}%
              </p>
              <p className="text-[10px] dark:text-gray-500 text-gray-400">vs semana pasada</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
