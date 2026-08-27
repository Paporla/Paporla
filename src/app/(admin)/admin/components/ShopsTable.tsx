'use client'

import { motion } from 'framer-motion'
import { Edit, Store, Calendar } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/formatDate'
import { getShopStatusConfig } from '@/lib/constants/shopStatus'
import { AdminShop } from '@/components/admin/useAdminShops'

interface ShopsTableProps {
  shops: AdminShop[]
  onEdit: (shop: AdminShop) => void
}

/**
 * Tabla de comercios del panel admin (Fase 6): estado real desde
 * `shop.status` (0003) + motivo de la última decisión. Una sola acción por
 * fila (abrir la moderación): el ban/verificación rápida y el borrado no
 * existían como camino canónico y se quitaron.
 */
export default function ShopsTable({ shops, onEdit }: ShopsTableProps) {
  return (
    <Card glass className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b dark:border-gray-800 border-gray-200">
            <tr className="text-left dark:text-gray-400 text-gray-600 text-sm">
              <th className="px-4 py-3">Comercio</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop, index) => {
              const statusConfig = getShopStatusConfig(shop.status)
              return (
                <motion.tr
                  key={shop.shop_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b dark:border-gray-800/50 border-gray-200 dark:hover:bg-gray-800/30 hover:bg-gray-100 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium dark:text-white text-gray-900">{shop.name}</p>
                      {shop.phone_e164 && (
                        <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{shop.phone_e164}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="dark:text-gray-400 text-gray-600 text-sm">{shop.address_line1 ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                      {shop.status_reason && (
                        <span
                          className="text-[10px] dark:text-gray-500 text-gray-400 max-w-[200px] truncate"
                          title={shop.status_reason}
                        >
                          {shop.status_reason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(shop.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(shop)}
                        ariaLabel={`Moderar ${shop.name}`}
                        className="p-1.5"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {shops.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 dark:text-gray-600 text-gray-400 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay comercios registrados</p>
        </div>
      )}
    </Card>
  )
}
