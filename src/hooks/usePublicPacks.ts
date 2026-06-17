'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { PublicPack } from '@/components/packs/PackCardPublic'

interface Filters {
  search: string
  minPrice: number
  maxPrice: number
  showAvailableOnly: boolean
  city: string
}

export function usePublicPacks() {
  const supabase = supabaseBrowser()
  const [allPacks, setAllPacks] = useState<PublicPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({
    search: '',
    minPrice: 0,
    maxPrice: 100000,
    showAvailableOnly: false,
    city: '',
  })

  const loadPacks = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('available_packs')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) setError(err.message)
      else setAllPacks((data as PublicPack[]) || [])
    } catch {
      setError('Error al cargar packs')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPacks()
  }, [])

  const filteredPacks = useMemo(() => {
    let f = [...allPacks]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      f = f.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (filters.minPrice > 0) f = f.filter((p) => p.price_cents >= filters.minPrice)
    if (filters.maxPrice < 100000) f = f.filter((p) => p.price_cents <= filters.maxPrice)
    if (filters.showAvailableOnly) f = f.filter((p) => p.remaining_stock > 0)
    if (filters.city) f = f.filter((p) => p.shop_city === filters.city)
    return f
  }, [allPacks, filters])

  return { allPacks, packs: filteredPacks, loading, error, setError, filters, setFilters, reload: loadPacks }
}
