'use client'

import { motion } from 'framer-motion'
import { Package, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import type { TopPack } from './useBusinessAnalytics'

interface Props { packs: TopPack[] }

export default function TopPacksTable({ packs }: Props) {
  if (packs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card-base"
      >
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-white">Top packs vendidos</h3>
        </div>
        <p className="text-gray-500 text-sm py-8 text-center">Aun no hay ventas registradas</p>
      </motion.div>
    )
  }

  const maxSold = packs[0]?.totalSold || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-base"
    >
      <div className="flex items-center gap-2 mb-5">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-white">Top packs vendidos</h3>
      </div>
      <div className="space-y-3">
        {packs.map((pack, idx) => (
          <Link key={pack.id} href={`/business/packs/${pack.id}`} className="block group">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              {/* Posicion */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-dark-muted text-gray-500'
              }`}>
                {idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-primary transition-colors truncate">
                  {pack.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">{pack.totalSold} vendidos</span>
                  <span className="text-xs text-green-400">${pack.revenue.toFixed(2)}</span>
                </div>
              </div>

              {/* Barra visual */}
              <div className="hidden sm:block w-24">
                <div className="h-1.5 bg-dark-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(pack.totalSold / maxSold) * 100}%` }}
                  />
                </div>
              </div>

              {/* Cancelacion */}
              {pack.cancellationRate > 0 && (
                <div className={`flex items-center gap-1 text-xs ${
                  pack.cancellationRate > 20 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {pack.cancellationRate > 20 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  )}
                  {pack.cancellationRate}%
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}
