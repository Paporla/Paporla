'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useBusinessShop } from '@/lib/query/useBusinessShop'

export interface BusinessPack {
  id: string
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  total_stock: number
  remaining_stock: number
  is_active: boolean
  created_at: string
  ends_at: string | null
  image_url: string | null
}

export function useBusinessPacks() {
  const { data: shop } = useBusinessShop()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data: packs = [], isLoading: loading } = useQuery({
    queryKey: ['business-packs', shop?.id],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .eq('shop_id', shop!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as BusinessPack[]
    },
    enabled: !!shop,
    staleTime: 30 * 1000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business-packs', shop?.id] })

  const deleteMutation = useMutation({
    mutationFn: async (packId: string) => {
      const supabase = supabaseBrowser()
      const { error: deleteError } = await supabase
        .from('packs')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', packId)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      setSuccess('Pack desactivado correctamente')
      invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const filteredPacks = useMemo(() => {
    if (!searchTerm) return packs
    return packs.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [searchTerm, packs])

  const stats = useMemo(
    () => ({
      total: packs.length,
      active: packs.filter((p) => p.is_active).length,
      inactive: packs.filter((p) => !p.is_active).length,
      lowStock: packs.filter((p) => p.remaining_stock > 0 && p.remaining_stock / p.total_stock < 0.2).length,
    }),
    [packs],
  )

  const confirmDelete = async (packId: string) => {
    setDeleting(packId)
    setError('')

    const supabase = supabaseBrowser()
    const { count: activeCount, error: countError } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('pack_id', packId)
      .in('status', ['confirmed', 'pending'])

    setDeleting(null)

    if (countError) {
      setError(countError.message)
      return null
    }

    if (activeCount && activeCount > 0) {
      setError(`No se puede eliminar: ${activeCount} reserva(s) activa(s). Cancela las reservas primero.`)
      return null
    }

    return packId
  }

  const handleDelete = async (packId: string) => {
    setDeleting(packId)
    await deleteMutation.mutateAsync(packId)
    setDeleting(null)
  }

  return {
    shopId: shop?.id ?? null,
    loading,
    error,
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    packs: filteredPacks,
    stats,
    deleting,
    confirmDelete,
    handleDelete,
    reload: invalidate,
  }
}
