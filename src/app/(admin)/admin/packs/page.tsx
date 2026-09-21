'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Package, Search, Filter, Power, PlayCircle } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Toast from '@/components/ui/Toast'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminPacks, AdminPackRow } from '@/components/admin/useAdminPacks'
import { PACK_STATUSES, getPackStatusConfig, PackAdminAction } from '@/lib/constants/packStatus'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatPickupWindow } from '@/lib/utils/formatDate'
import { translateDbError } from '@/lib/utils/db-errors'
import PackStatusModal from '../components/PackStatusModal'

/**
 * /admin/packs (ADMIN-2): el catálogo dejó de ser solo de lectura. Cada
 * tarjeta con estado 'active' puede PAUSARSE y cada 'paused' puede
 * REACTIVARSE desde aquí, SIEMPRE con motivo, vía la RPC segura
 * `admin_set_pack_status` (0055) que aplica las mismas reglas que el
 * comercio (set_pack_paused, 0009) y deja rastro en activity_logs.
 *
 * Datos por la RPC canónica `list_admin_packs` (0032) vía useAdminPacks;
 * búsqueda y filtro por estado EN EL CLIENTE (mismo patrón que reservas).
 * Los demás estados (draft/sold_out/expired/archived) no llevan botón:
 * no es tarea del panel admin "resucitar" packs del propio ciclo de vida.
 */
export default function AdminPacksPage() {
  const queryClient = useQueryClient()
  const { packs, loading, error } = useAdminPacks()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalPack, setModalPack] = useState<AdminPackRow | null>(null)
  const [modalAction, setModalAction] = useState<PackAdminAction | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorToast, setErrorToast] = useState('')
  const [successToast, setSuccessToast] = useState('')

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of packs) {
      counts[p.status] = (counts[p.status] ?? 0) + 1
    }
    return counts
  }, [packs])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return packs.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      return `${p.title} ${p.shop_name ?? ''}`.toLowerCase().includes(q)
    })
  }, [packs, statusFilter, searchTerm])

  const openModal = (pack: AdminPackRow, action: PackAdminAction) => {
    setModalPack(pack)
    setModalAction(action)
    setModalOpen(true)
  }

  /**
   * Aplica pausa/reactivación vía `admin_set_pack_status` (0055). Devuelve
   * null en éxito o el error ya traducido (mismo contrato que la moderación
   * de comercios).
   */
  const handleSetStatus = async (packId: string, action: PackAdminAction, reason: string): Promise<string | null> => {
    setBusy(true)
    try {
      const supabase = supabaseBrowser()
      const { error: rpcError } = await supabase.rpc('admin_set_pack_status', {
        p_pack_id: packId,
        p_action: action,
        p_reason: reason,
      })
      if (rpcError) {
        const translated = translateDbError(rpcError)
        setErrorToast(translated)
        return translated
      }
      setSuccessToast(action === 'pause' ? 'Pack pausado' : 'Pack reactivado')
      queryClient.invalidateQueries({ queryKey: ['admin-packs'] })
      return null
    } finally {
      setBusy(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const hayFiltros = statusFilter !== 'all' || searchTerm.trim() !== ''
  const truncated = packs.length >= 200

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Packs</h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              {hayFiltros
                ? `${filtered.length} de ${packs.length} packs`
                : `${packs.length} ${packs.length === 1 ? 'pack' : 'packs'} — catálogo completo`}
              {truncated ? ' (mostrando los 200 más recientes)' : ''}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar packs: {translateDbError(error)}</p>
        </div>
      ) : packs.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay packs registrados</p>
        </div>
      ) : (
        <>
          {/* Chips de filtro por estado con conteo */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
              }`}
            >
              Todos ({packs.length})
            </button>
            {PACK_STATUSES.map((status) => {
              const config = getPackStatusConfig(status)
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-on-primary'
                      : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/20 dark:hover:bg-white/10'
                  }`}
                >
                  {config.label} ({statusCounts[status] ?? 0})
                </button>
              )
            })}
          </div>

          {/* Barra de búsqueda */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
              <Input
                placeholder="Buscar por pack o comercio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Mostrando: {filtered.length}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="dark:text-gray-400 text-gray-600 font-medium mb-1">Ningún pack coincide con la búsqueda</p>
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((pack) => {
                const st = getPackStatusConfig(pack.status)
                return (
                  <div key={pack.pack_id} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium dark:text-white text-gray-900 truncate">{pack.title}</p>
                        <p className="text-xs dark:text-gray-500 text-gray-400 truncate">{pack.shop_name ?? '—'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${st.className}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold dark:text-white text-gray-900">
                        {formatMinorPrice(Number(pack.price_minor ?? 0), pack.currency_code, 'es-CL')}
                      </span>
                      {pack.original_price_minor ? (
                        <span className="text-xs line-through dark:text-gray-500 text-gray-400">
                          {formatMinorPrice(Number(pack.original_price_minor), pack.currency_code, 'es-CL')}
                        </span>
                      ) : null}
                      <span className="text-xs dark:text-gray-400 text-gray-600 ml-auto">
                        Stock: {pack.remaining_stock}/{pack.total_stock}
                      </span>
                    </div>

                    <p className="text-[11px] dark:text-gray-400 text-gray-600">
                      Recogida:{' '}
                      {formatPickupWindow(
                        pack.pickup_start_at,
                        pack.pickup_end_at,
                        pack.timezone_snapshot || 'America/Santiago',
                      )}
                    </p>

                    <div className="mt-auto">
                      {pack.status === 'active' ? (
                        <Button variant="secondary" className="w-full" onClick={() => openModal(pack, 'pause')}>
                          <Power className="w-4 h-4 mr-2" />
                          Pausar
                        </Button>
                      ) : pack.status === 'paused' ? (
                        <Button variant="primary" className="w-full" onClick={() => openModal(pack, 'activate')}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Reactivar
                        </Button>
                      ) : (
                        <p className="text-[11px] dark:text-gray-500 text-gray-400 text-center py-2">
                          Sin acciones del panel (estado {st.label.toLowerCase()})
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <PackStatusModal
        key={modalPack?.pack_id ?? 'none'}
        isOpen={modalOpen}
        pack={modalPack}
        action={modalAction}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSetStatus}
        busy={busy}
      />

      {errorToast ? <Toast message={errorToast} type="error" onClose={() => setErrorToast('')} /> : null}
      {successToast ? <Toast message={successToast} type="success" onClose={() => setSuccessToast('')} /> : null}
    </div>
  )
}
