'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ShoppingBag, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils/formatPrice'

interface StatsCardsProps {
  activeCount: number
  totalValue: number
  completedCount: number
  onScrollToActive: () => void
  onScrollToHistory: () => void
  trend?: { active: number; value: number; completed: number }
}

export default function StatsCards({
  activeCount,
  totalValue,
  completedCount,
  onScrollToActive,
  onScrollToHistory,
  trend = { active: 0, value: 0, completed: 0 },
}: StatsCardsProps) {
  const cards = [
    {
      icon: Clock,
      label: 'Reservas activas',
      value: activeCount,
      trend: trend.active,
      onClick: onScrollToActive,
      action: 'Ver mis reservas',
      color: 'text-primary',
    },
    {
      icon: ShoppingBag,
      label: 'En reservas activas',
      value: formatPrice(totalValue),
      trend: trend.value,
      href: '/packs',
      action: 'Explorar packs',
      color: 'text-primary',
    },
    {
      icon: CheckCircle,
      label: 'Reservas completadas',
      value: completedCount,
      trend: trend.completed,
      onClick: onScrollToHistory,
      action: 'Ver historial',
      color: 'text-primary',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {cards.map((card, idx) => {
        const isPositive = card.trend >= 0
        const TrendIcon = isPositive ? TrendingUp : TrendingDown

        const cardContent = (
          <Card glass hover className="cursor-pointer transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-8 h-8 ${card.color}`} />
              {card.trend !== 0 && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
                >
                  <TrendIcon className="w-3 h-3" />
                  {Math.abs(card.trend)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold dark:text-white text-gray-900">{card.value}</div>
            <div className="text-sm dark:text-gray-400 text-gray-700">{card.label}</div>
            <div className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {card.action} →
            </div>
          </Card>
        )

        if (card.href) {
          return (
            <Link key={idx} href={card.href}>
              {cardContent}
            </Link>
          )
        }
        return (
          <button key={idx} onClick={card.onClick} className="text-left w-full">
            {cardContent}
          </button>
        )
      })}
    </motion.div>
  )
}
