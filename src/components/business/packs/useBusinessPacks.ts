'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessShop } from '@/lib/query/useBusinessShop'
import { canArchivePack, getPackAction, type PackStatus } from '@/lib/utils/packActions'
import { translateDbError } from '@/lib/utils/db-errors'

export interface BusinessPack {
  id: string
  title: string
  description: string | null
  /** Estado canónico. Es la fuente de verdad; `is_active` se deriva de él. */
  status: PackStatus
  is_active: boolean
  remaining_stock: number
  total_stock: number
  /** Importe en la unidad menor de la moneda. CLP no tiene decimales. */
  price_minor: number
  currency_code: string
  ends_at: string | null
}

type ListedPack = {
  pack_id: string
  title: string
  status: string
  price_minor: number
  currency_code?: string | null
  total_stock: number
  remaining_stock: number
  pickup_end_at: string | null
}

export function useBusinessPacks() {
  const { user } = useAuth()
  const { data: shop } = useBusinessShop()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  /** Id del pack cuya acción de estado está en curso. */
  const [updatingPackId, setUpdatingPackId] = useState<string | null>(null)
  /** Id del pack que se está eliminando, para deshabilitar solo esa tarjeta. */
  const [archivingPackId, setArchivingPackId] = useState<string | null>(null)

  const packsQuery = useQuery({
    queryKey: ['business-packs', user?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error: err } = await supabase.rpc('list_my_packs', {
        p_before_created_at: null,
        p_before_pack_id: null,
        p_limit: 50,
      })
      if (err) throw err

      const rows = (data ?? []) as ListedPack[]
      return rows
        .filter((p) => p.status !== 'archived')
        .map((p): BusinessPack => ({
          id: p.pack_id,
          title: p.title,
          description: null,
          status: p.status as PackStatus,
          is_active: p.status === 'active',
          remaining_stock: p.remaining_stock,
          total_stock: p.total_stock,
          price_minor: Number(p.price_minor),
          currency_code: p.currency_code ?? 'CLP',
          ends_at: p.pickup_end_at,
        }))
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const allPacks = packsQuery.data ?? []
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const packs = normalizedSearch ? allPacks.filter((p) => p.title.toLowerCase().includes(normalizedSearch)) : allPacks

  const stats = {
    total: allPacks.length,
    active: allPacks.filter((p) => p.status === 'active').length,
    paused: allPacks.filter((p) => p.status === 'paused').length,
    draft: allPacks.filter((p) => p.status === 'draft').length,
    inactive: allPacks.filter((p) => p.status !== 'active').length,
    lowStock: allPacks.filter((p) => p.status === 'active' && p.remaining_stock <= 2).length,
  }

  /**
   * Ejecuta la acción de estado que corresponda al pack.
   * La RPC se elige a partir del estado actual, no de un toggle ciego:
   *   draft  → publish_pack
   *   active → set_pack_paused(true)
   *   paused → set_pack_paused(false)
   */
  const changePackState = async (id: string) => {
    const pack = allPacks.find((p) => p.id === id)
    if (!pack) {
      setError('No se encontró el pack.')
      return
    }

    const action = getPackAction(pack.status)
    if (!action.rpc) {
      setError('Este pack no admite cambios de estado en su situación actual.')
      return
    }

    setUpdatingPackId(id)
    setError('')
    try {
      const { error: err } = await supabaseBrowser().rpc(action.rpc, {
        p_pack_id: id,
        ...action.args,
      })
      if (err) throw err

      setSuccess(action.successMessage)
      await queryClient.invalidateQueries({ queryKey: ['business-packs'] })
    } catch (e: unknown) {
      setError(translateDbError(e, 'No se pudo cambiar el estado del pack.'))
    } finally {
      setUpdatingPackId(null)
    }
  }

  /**
   * Elimina (archiva) el pack. `archive_pack` es un soft delete: marca
   * `status='archived'` y `archived_at`, no borra la fila. Aun así, para el
   * comerciante es definitivo, porque no existe `unarchive_pack` y este hook
   * filtra los archivados del listado.
   *
   * La comprobación de estado se repite aquí aunque la interfaz ya oculte el
   * botón: la interfaz puede quedarse con datos viejos y el pack haber sido
   * publicado desde otra pestaña. La base de datos es la última palabra
   * (rechaza con P0001 si hay reservas vivas), esto solo evita el viaje.
   */
  const archivePack = async (id: string) => {
    const pack = allPacks.find((p) => p.id === id)
    if (!pack) {
      setError('No se encontró el pack.')
      return
    }

    if (!canArchivePack(pack.status)) {
      setError('Pausa el pack antes de eliminarlo.')
      return
    }

    setArchivingPackId(id)
    setError('')
    try {
      const { error: err } = await supabaseBrowser().rpc('archive_pack', { p_pack_id: id })
      if (err) throw err

      setSuccess(`Se eliminó «${pack.title}».`)
      await queryClient.invalidateQueries({ queryKey: ['business-packs'] })
    } catch (e: unknown) {
      setError(translateDbError(e, 'No se pudo eliminar el pack.'))
    } finally {
      setArchivingPackId(null)
    }
  }

  return {
    loading: packsQuery.isLoading,
    error: error || (packsQuery.error ? translateDbError(packsQuery.error) : ''),
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    packs,
    shopId: shop?.id ?? null,
    stats,
    updatingPackId,
    archivingPackId,
    changePackState,
    archivePack,
    reload: () => queryClient.invalidateQueries({ queryKey: ['business-packs'] }),
  }
}
