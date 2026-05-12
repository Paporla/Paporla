'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

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
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [shopId, setShopId] = useState<string | null>(null)
  const [packs, setPacks] = useState<BusinessPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadShopAndPacks()
  }, [user])

  const filteredPacks = useMemo(() => {
    if (!searchTerm) return packs
    return packs.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [searchTerm, packs])

  const stats = useMemo(() => ({
    total: packs.length,
    active: packs.filter(p => p.is_active).length,
    inactive: packs.filter(p => !p.is_active).length,
    lowStock: packs.filter(p => p.remaining_stock > 0 && p.remaining_stock / p.total_stock < 0.2).length,
  }), [packs])

  const loadShopAndPacks = async () => {
    if (!user) return
    setLoading(true)
    setError('')

    const { data: shopData, error: shopError } = await supabase
      .from('shops').select('id').eq('owner_id', user.id).maybeSingle()

    if (shopError || !shopData) {
      setError(shopError?.message || 'No se encontró tu comercio')
      setLoading(false)
      return
    }

    setShopId(shopData.id)

    const { data: packsData, error: packsError } = await supabase
      .from('packs').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false })

    if (packsError) {
      setError(packsError.message)
    } else {
      setPacks(packsData || [])
    }
    setLoading(false)
  }

  const confirmDelete = async (packId: string) => {
    setDeleting(packId)
    setError('')

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

    const { error: deleteError } = await supabase
      .from('packs')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', packId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess('Pack desactivado correctamente')
      await loadShopAndPacks()
    }
    setDeleting(null)
  }

  return {
    shopId, loading, error, success, setError, setSuccess,
    searchTerm, setSearchTerm, packs: filteredPacks, stats,
    deleting, confirmDelete, handleDelete,
    reload: loadShopAndPacks,
  }
}
