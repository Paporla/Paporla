'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export const savingTips = [
  { icon: '', text: 'Reserva temprano para conseguir los mejores packs' },
  { icon: '', text: 'Sigue a tus comercios favoritos para recibir notificaciones' },
  { icon: '', text: 'Los packs sorpresa ahorran hasta 70% comparado con el precio original' },
  { icon: '', text: 'Al comprar packs, ayudas a reducir el desperdicio alimentario' },
  { icon: '', text: 'Revisa nuevos comercios cada semana, hay sorpresas' },
]

interface TipOfDayProps {
  tip: { icon: string; text: string }
}

export default function TipOfDay({ tip }: TipOfDayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="glass-card rounded-xl p-3 flex items-center gap-3">
        <span className="text-2xl">{tip.icon}</span>
        <p className="text-sm dark:text-gray-300 text-gray-700 flex-1">{tip.text}</p>
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
    </motion.div>
  )
}