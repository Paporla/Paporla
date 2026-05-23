'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PackWithShop } from '@/types/pack'

interface SearchFilters {
  search: string
  minPrice: number
  maxPrice: number
  city: string
  showAvailableOnly: boolean
}

interface SearchResponse {
  results: PackWithShop[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function usePackSearch(initialFilters?: Partial<SearchFilters>) {
  const [packs, setPacks] = useState<PackWithShop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    minPrice: 0,
    maxPrice: 100000,
    city: '',
    showAvailableOnly: true,
    ...initialFilters,
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  const loadPacks = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('type', 'packs')
      params.set('page', String(pageNum))
      params.set('limit', '20')
      params.set('available', String(filters.showAvailableOnly))

      if (filters.search) params.set('q', filters.search)
      if (filters.minPrice > 0) params.set('minPrice', String(filters.minPrice))
      if (filters.maxPrice < 100000) params.set('maxPrice', String(filters.maxPrice))
      if (filters.city) params.set('city', filters.city)

      try {
        const response = await fetch(`/api/search?${params.toString()}`)
        if (!response.ok) throw new Error('Error en la búsqueda')

        const data: SearchResponse = await response.json()
        setPacks(data.results)
        setTotalPages(data.totalPages)
        setTotalResults(data.total)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar packs')
      } finally {
        setLoading(false)
      }
    },
    [filters],
  )

  useEffect(() => {
    loadPacks(1)
    setPage(1)
  }, [loadPacks])

  const goToPage = (pageNum: number) => {
    setPage(pageNum)
    loadPacks(pageNum)
  }

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      minPrice: 0,
      maxPrice: 100000,
      city: '',
      showAvailableOnly: true,
    })
  }

  return {
    packs,
    loading,
    error,
    filters,
    page,
    totalPages,
    totalResults,
    goToPage,
    updateFilter,
    resetFilters,
    reload: () => loadPacks(page),
  }
}
