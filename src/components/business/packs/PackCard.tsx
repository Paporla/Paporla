'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Edit, Trash2, CheckCircle, EyeOff, AlertCircle, Clock, Copy } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import type { BusinessPack } from './useBusinessPacks'

function getStockStatus(remaining: number, total: number) {
  const pct = (remaining / total) * 100
  if (pct === 0) return { label: 'Agotado', color: 'bg-red-500/20 text-red-400', icon: AlertCircle }
  if (pct < 20) return { label: 'Stock bajo', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle }
  return { label: 'Disponible', color: 'bg-green-500/20 text-green-400', icon: CheckCircle }
}

interface Props {
  pack: BusinessPack
  index: number
  deleting: string | null
  onDeleteClick: (id: string) => void
}

export default function PackCard({ pack, index, deleting, onDeleteClick }: Props) {
  const stock = getStockStatus(pack.remaining_stock, pack.total_stock)
  const StockIcon = stock.icon
  const pct = pack.total_stock > 0 ? Math.round((pack.remaining_stock / pack.total_stock) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card glass hover className="p-5 group">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                {pack.title}
              </h3>
              {pack.is_active ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Activo
                </span>
              ) : (
                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Inactivo
                </span>
              )}
              <span className={`text-xs ${stock.color} px-2 py-0.5 rounded-full flex items-center gap-1`}>
                <StockIcon className="w-3 h-3" /> {stock.label}
              </span>
            </div>

            {pack.description && (
              <p className="text-sm text-gray-400 mb-2 line-clamp-1">{pack.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-primary font-semibold text-lg">{formatPrice(pack.price_cents)}</span>
              <span className="text-gray-500 flex items-center gap-1">
                <Package className="w-3 h-3" /> Stock: {pack.remaining_stock}/{pack.total_stock}
              </span>
              {pack.ends_at && (
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hasta: {formatDate(pack.ends_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/business/packs/${pack.id}/duplicate`}>
              <Button variant="outline" size="sm" className="p-2"><Copy className="w-4 h-4" /></Button>
            </Link>
            <Link href={`/business/packs/${pack.id}`}>
              <Button variant="outline" size="sm" className="p-2"><Edit className="w-4 h-4" /></Button>
            </Link>
            <Button variant="danger" size="sm" onClick={() => onDeleteClick(pack.id)} disabled={deleting === pack.id} className="p-2">
              {deleting === pack.id ? (
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Stock restante</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
