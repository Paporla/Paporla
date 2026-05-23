'use client'

import { motion } from 'framer-motion'
import { Package, DollarSign, Leaf, TrendingUp } from 'lucide-react'

interface ProfileStatsProps {
  packsRescued: number
  moneySaved: number
  co2Avoided: string
  level: string
  points: number
}

export default function ProfileStats({
  packsRescued,
  moneySaved,
  co2Avoided,
  level: _level,
  points,
}: ProfileStatsProps) {
  const stats = [
    { label: 'Packs rescatados', value: packsRescued, icon: Package, color: 'text-primary', suffix: '' },
    { label: 'Ahorrado', value: `$${moneySaved.toFixed(2)}`, icon: DollarSign, color: 'text-green-400', suffix: '' },
    { label: 'CO₂ evitado', value: co2Avoided, icon: Leaf, color: 'text-amber-400', suffix: '' },
    { label: 'Puntos', value: points, icon: TrendingUp, color: 'text-primary', suffix: ' pts' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-dark-card border border-dark-border rounded-xl p-4 text-center"
        >
          <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
          <p className="text-xl font-black text-white">{stat.value}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
