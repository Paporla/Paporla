'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

export interface BusinessPack {
  id: string
  title: string
  description: string | null
  is_active: boolean
  status: string
  remaining_stock: number
  total_stock: number
  price_cents: number
  ends_at: string | null
}

type ListedPack = {
  pack_id: string
  title: string
  status: string
  price_minor: number
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
  const [deleting, setDeleting] = useState<string | null>(null)

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
      const visible = rows.filter((p) => p.status !== 'archived')
      return visible.map((p): BusinessPack => ({
        id: p.pack_id,
        title: p.title,
        description: null,
        status: p.status,
        is_active: p.status === 'active',
        remaining_stock: p.remaining_stock,
        total_stock: p.total_stock,
        price_cents: Number(p.price_minor),
        ends_at: p.pickup_end_at,
      }))
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  const allPacks = packsQuery.data ?? []
  const packs = allPacks.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const stats = {
    total: allPacks.length,
    active: allPacks.filter((p) => p.status === 'active').length,
    inactive: allPacks.filter((p) => p.status !== 'active').length,
    draft: allPacks.filter((p) => p.status === 'draft').length,
    lowStock: allPacks.filter((p) => p.status === 'active' && p.remaining_stock <= 2).length,
  }

  const confirmDeactivate = async (id: string) => id

  const handleDeactivate = async (id: string) => {
    const pack = allPacks.find((p) => p.id === id)
    const supabase = supabaseBrowser()
    setDeleting(id)
    try {
      if (pack?.status === 'active') {
        const { error: err } = await supabase.rpc('set_pack_paused', { p_pack_id: id, p_paused: true })
        if (err) throw err
        setSuccess('Pack pausado. No se muestra en el catálogo.')
      } else if (pack?.status === 'paused' || pack?.status === 'draft') {
        const { error: err } = await supabase.rpc('publish_pack', { p_pack_id: id })
        if (err) throw err
        setSuccess('Pack publicado.')
      } else {
        setError('Este pack no se puede pausar ni publicar ahora.')
      }
      await queryClient.invalidateQueries({ queryKey: ['business-packs'] })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado del pack')
    } finally {
      setDeleting(null)
    }
  }

  return {
    loading: packsQuery.isLoading,
    error: error || packsQuery.error?.message || '',
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    packs,
    shopId: shop?.id ?? null,
    stats,
    deleting,
    confirmDeactivate,
    handleDeactivate,
    reload: () => queryClient.invalidateQueries({ queryKey: ['business-packs'] }),
  }
}
