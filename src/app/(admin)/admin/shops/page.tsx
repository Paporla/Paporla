'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminShops, AdminShop } from '@/components/admin/useAdminShops'
import { useAdminCounts } from '@/lib/query/useAdminCounts'
import { translateDbError } from '@/lib/utils/db-errors'
import { SHOP_STATUSES, MODERATION_VERB, getShopStatusConfig, ShopModerationAction } from '@/lib/constants/shopStatus'
import { motion } from 'framer-motion'
import { Store, Search, Filter } from 'lucide-react'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import ShopsTable from '../components/ShopsTable'
import ShopModal from '../components/ShopModal'
import LoadingSkeleton from '../components/LoadingSkeleton'

/**
 * Gestión de comercios (Fase 6, H3+H4): listado sobre la RPC canónica
 * `list_admin_shops` (0027) y moderación sobre `admin_review_shop`
 * (0009:1383).
 *
 * Decisiones de UI:
 *  - Sin botón de borrar: el esquema no tiene camino canónico de borrado
 *    (solo `deleted_at` para el comercio vía su propio flujo).
 *  - Los filtros por estado van por `p_status` de la RPC; la búsqueda por
 *    nombre se hace en el cliente (volumen de piloto, mismo patrón que las
 *    páginas del comercio).
 */
export default function AdminShopsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShop, setSelectedShop] = useState<AdminShop | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const { shops, loading, error: shopsError } = useAdminShops(statusFilter === 'all' ? null : statusFilter)
  const { data: counts } = useAdminCounts()

  const filteredShops = searchTerm
    ? shops.filter((shop) => shop.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : shops

  const openShopModal = (shop: AdminShop) => {
    setSelectedShop(shop)
    setModalOpen(true)
  }

  /**
   * Modera el comercio vía `admin_review_shop`: estado destino
   * (verified/rejected/suspended) + motivo de 3+ caracteres (la base lo
   * exige). Devuelve null en éxito o el error ya traducido para la UI.
   */
  const handleModerate = async (
    shopId: string,
    newStatus: ShopModerationAction,
    reason: string,
  ): Promise<string | null> => {
    setBusy(true)
    try {
      const supabase = supabaseBrowser()
      const { error } = await supabase.rpc('admin_review_shop', {
        p_shop_id: shopId,
        p_new_status: newStatus,
        p_reason: reason,
      })
      if (error) {
        const translated = translateDbError(error)
        setError(translated)
        return translated
      }
      setSuccess(`Comercio ${MODERATION_VERB[newStatus]}`)
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      return null
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">Gestión de Comercios</h1>
            <p className="dark:text-gray-400 text-gray-600 mt-1">
              Revisa y modera los comercios de la plataforma: verificar, rechazar o suspender (siempre con motivo).
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filtros por estado (cuentas del dashboard, byStatus de admin_counts) */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white'
              : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
          }`}
        >
          Todas ({counts?.shops ?? 0})
        </button>
        {SHOP_STATUSES.map((status) => {
          const config = getShopStatusConfig(status)
          const count = counts?.byStatus?.[status] ?? 0
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Total: {filteredShops.length} comercios
        </div>
      </div>

      {/* Tabla de comercios */}
      <ShopsTable shops={filteredShops} onEdit={openShopModal} />

      {/* Modal de moderación */}
      <ShopModal
        isOpen={modalOpen}
        shop={selectedShop}
        onClose={() => {
          setModalOpen(false)
          setSelectedShop(null)
        }}
        onModerate={handleModerate}
        busy={busy}
      />

      {(error || shopsError) && <Toast message={error || shopsError} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
