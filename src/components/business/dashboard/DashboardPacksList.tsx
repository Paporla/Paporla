'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Eye } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { PackBrief } from './useBusinessDashboard'

interface Props {
  packs: PackBrief[]
}

export default function DashboardPacksList({ packs }: Props) {
  return (
    <Card glass className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold dark:text-white text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Mis Packs
        </h2>
        <Link href="/business/packs">
          <Button variant="outline" size="sm">Ver todos</Button>
        </Link>
      </div>

      {packs.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No tienes packs creados</p>
          <Link href="/business/packs/new">
            <Button size="sm" className="mt-3">Crear mi primer pack</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.slice(0, 5).map((pack, idx) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/business/packs/${pack.id}`}>
                <div className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 bg-gray-50 dark:hover:bg-white/10 hover:bg-gray-100 transition-all cursor-pointer group">
                  <div>
                    <p className="font-medium dark:text-white text-gray-900 group-hover:text-primary transition-colors">{pack.title}</p>
                    <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                      Stock: {pack.remaining_stock} | {pack.is_active ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-semibold text-sm">${(pack.price_cents / 100).toFixed(2)}</span>
                    <Eye className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}
