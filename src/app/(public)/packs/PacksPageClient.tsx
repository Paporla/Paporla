'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePublicPacks } from '@/hooks/usePublicPacks'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'
import PackCardPublic from '@/components/packs/PackCardPublic'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'
import PacksHeroSection from '@/components/packs/PacksHeroSection'
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid'

const ITEMS_PER_PAGE = 9

export default function PacksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { packs, loading, error: hookError, setError, setFilters } = usePublicPacks()
  const [currentPage, setCurrentPage] = useState(1)
  const [reserving, setReserving] = useState<string | null>(null)
  const [reservedFromRedirect, setReservedFromRedirect] = useState(false)

  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPacks = useMemo(() => packs.slice(startIndex, startIndex + ITEMS_PER_PAGE), [packs, startIndex])

  const handleFilterChange = (f: Parameters<typeof setFilters>[0]) => {
    setFilters(f)
    setCurrentPage(1)
  }

  const handleReserve = async (packId: string) => {
    if (!user) {
      // Guardar el pack en la URL para redirigir de vuelta tras login/registro
      router.push(`/login?redirect=/packs&reserve=${packId}`)
      return
    }

    const pack = packs.find((p) => p.id === packId)
    if (!pack?.shop_id) {
      setError('No se pudo identificar el comercio')
      return
    }

    setReserving(packId)
    setError('')

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, shop_id: pack.shop_id, quantity: 1 }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error ?? 'Error al realizar la reserva')
      }

      router.push('/dashboard?reserved=true')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al realizar la reserva')
    } finally {
      setReserving(null)
    }
  }

  // Auto-reservar cuando el usuario vuelve tras login/registro con ?reserve=PACK_ID
  useEffect(() => {
    const reservePackId = searchParams.get('reserve')
    if (!reservePackId || !user || reservedFromRedirect || loading) return

    // Verificar que el pack existe en la lista cargada
    const pack = packs.find((p) => p.id === reservePackId)
    if (!pack) return

    setReservedFromRedirect(true)
    handleReserve(reservePackId)
    // Limpiar el param de la URL sin recargar
    const url = new URL(window.location.href)
    url.searchParams.delete('reserve')
    window.history.replaceState({}, '', url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, packs, loading])

  if (loading) return <PacksLoadingGrid />

  return (
    <div className="min-h-screen">
      <PacksHeroSection count={packs.length} />

      <div className="container mx-auto px-4 py-8">
        <PackFiltersAdvanced onFilterChange={handleFilterChange} />

        {!loading && packs.length === 0 ? (
          <EmptyState
            type="packs"
            action={{
              label: 'Limpiar filtros',
              onClick: () =>
                handleFilterChange({ search: '', minPrice: 0, maxPrice: 100000, showAvailableOnly: false, city: '' }),
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map((pack, idx) => (
                <PackCardPublic key={pack.id} pack={pack} onReserve={handleReserve} index={idx} reserving={reserving} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </div>

      {hookError && <Toast message={hookError} type="error" onClose={() => setError('')} />}
    </div>
  )
}
