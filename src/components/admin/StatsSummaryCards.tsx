'use client'

import { motion } from 'framer-motion'
import { Users, Store, Package, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import Card from '@/components/ui/Card'

interface Summary { totalUsers: number; totalShops: number; totalPacks: number; totalReservations: number }
interface Growth { users: number }

const COLORS = { primary: '#27d3b8', secondary: '#ff8a3c', purple: '#8b5cf6', blue: '#3b82f6' }

const cards = [
  { icon: Users, label: 'Usuarios', key: 'totalUsers', color: COLORS.primary, growthKey: 'users' },
  { icon: Store, label: 'Comercios', key: 'totalShops', color: COLORS.secondary },
  { icon: Package, label: 'Packs', key: 'totalPacks', color: COLORS.purple },
  { icon: Calendar, label: 'Reservas', key: 'totalReservations', color: COLORS.blue },
] as const

interface Props { summary: Summary; growth: Growth }

export default function StatsSummaryCards({ summary, growth }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const value = summary[card.key as keyof Summary]
        const growthVal = 'growthKey' in card ? growth[card.growthKey as keyof Growth] : undefined
        return (
          <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card glass className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: card.color + '20' }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                {growthVal !== undefined && growthVal !== 0 && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-lg ${growthVal > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {growthVal > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(growthVal)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black dark:text-white text-gray-900 tabular-nums">{value.toLocaleString()}</p>
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{card.label}</p>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
