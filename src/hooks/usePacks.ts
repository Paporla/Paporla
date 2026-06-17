'use client'

import { useQuery } from '@tanstack/react-query'
import { PackWithShop } from '@/types/pack'

const PACKS_QUERY_KEY = 'packs'

async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Error al obtener packs')
  }
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Error en la solicitud')
  return data as T
}

async function fetchPacks(shopId?: string) {
  const url = shopId ? `/api/packs?shopId=${shopId}` : '/api/packs'
  const data = await apiFetch<{ success: boolean; packs: PackWithShop[] }>(url)
  return data.packs
}

async function fetchPackById(id: string) {
  const data = await apiFetch<{ success: boolean; pack: PackWithShop }>(`/api/packs?id=${id}`)
  return data.pack
}

export function usePacks(shopId?: string) {
  const query = useQuery({
    queryKey: [PACKS_QUERY_KEY, shopId ?? 'all'],
    queryFn: () => fetchPacks(shopId),
    staleTime: 30 * 1000,
  })

  return {
    packs: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    getPackById: fetchPackById,
  }
}
