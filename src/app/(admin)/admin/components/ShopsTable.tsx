'use client'

import { motion } from 'framer-motion'
import { Edit, Trash2, CheckCircle, XCircle, Store, Calendar, Eye, EyeOff } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/formatDate'
import { Shop } from '@/types/shop'

interface ShopsTableProps {
  shops: Shop[]
  onEdit: (shop: Shop) => void
  onVerify: (shopId: string, verified: boolean) => void
  onBan: (shopId: string, banned: boolean) => void
  onDelete: (shopId: string) => void
}

export default function ShopsTable({ shops, onEdit, onVerify, onBan, onDelete }: ShopsTableProps) {
  return (
    <Card glass className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr className="text-left text-gray-400 text-sm">
              <th className="px-4 py-3">Comercio</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop, index) => (
              <motion.tr
                key={shop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{shop.name}</p>
                    {shop.phone && (
                      <p className="text-xs text-gray-500 mt-0.5">📞 {shop.phone}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-400 text-sm">{shop.address || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {shop.verified ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verificado
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> No verificado
                      </span>
                    )}
                    {shop.banned && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Baneado
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(shop.created_at)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(shop)}
                      className="p-1.5"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!shop.verified && (
                      <Button
                        size="sm"
                        onClick={() => onVerify(shop.id, true)}
                        className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {shop.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerify(shop.id, false)}
                        className="p-1.5"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant={shop.banned ? "outline" : "danger"}
                      size="sm"
                      onClick={() => onBan(shop.id, !shop.banned)}
                      className="p-1.5"
                    >
                      {shop.banned ? <Eye className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(shop.id)}
                      className="p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {shops.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay comercios registrados</p>
        </div>
      )}
    </Card>
  )
}