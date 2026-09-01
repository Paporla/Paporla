'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePublicPacks } from '@/hooks/usePublicPacks'
import { trackViewPackList, trackClickReserve } from '@/lib/analytics/events'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'
import PackCardPublic from '@/components/packs/PackCardPublic'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'
import PacksHeroSection from '@/components/packs/PacksHeroSection'
import OnboardingSteps from '@/components/packs/OnboardingSteps'
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid'

const ITEMS_PER_PAGE = 9

export default function PacksPage() {
  const { packs, filters, loading, error: hookError, setError, setFilters } = usePublicPacks()
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPacks = useMemo(() => packs.slice(startIndex, startIndex + ITEMS_PER_PAGE), [packs, startIndex])

  const handleFilterChange = (nextFilters: Parameters<typeof setFilters>[0]) => {
    setFilters(nextFilters)
    setCurrentPage(1)
  }

  /**
   * La reserva SÍ funciona: vive en el modal de la página de detalle
   * (/packs/[id] → ReserveModal). Este botón lleva allí, registrando el clic
   * en el funnel. Antes mostraba «se activarán cuando integremos pagos» y
   * desactivaba la CTA — mensaje falso que mataba la conversión del catálogo
   * (hallazgo 4.2 de la auditoría 2026-09-01).
   */
  const handleReserve = (packId: string) => {
    const pack = packs.find((p) => p.id === packId)
    if (pack) trackClickReserve(pack.id, pack.title, pack.price_minor, pack.currency_code)
    router.push(`/packs/${packId}`)
  }

  useEffect(() => {
    if (!loading) trackViewPackList(packs.length)
  }, [loading, packs.length])

  if (loading) return <PacksLoadingGrid />

  return (
    <div className="min-h-screen">
      <PacksHeroSection count={packs.length} />

      <div className="container mx-auto px-4 py-8">
        <OnboardingSteps />
        <PackFiltersAdvanced onFilterChange={handleFilterChange} />

        {packs.length === 0 ? (
          <EmptyState
            type={filters.city || filters.search ? 'search' : 'packs'}
            title={
              filters.city
                ? `No hay packs en ${filters.city}`
                : filters.search
                  ? `No encontramos "${filters.search}"`
                  : 'Paporla está preparando sus primeros packs en Chile'
            }
            description={
              filters.city
                ? 'Prueba buscando en otra localidad o explora todos los packs.'
                : filters.search
                  ? 'Prueba con otra búsqueda o limpia los filtros.'
                  : 'Estamos incorporando comercios piloto. Pronto podrás activar avisos para tu localidad.'
            }
            action={{
              label: 'Limpiar filtros',
              onClick: () =>
                handleFilterChange({
                  search: '',
                  minPrice: 0,
                  maxPrice: 100000,
                  showAvailableOnly: false,
                  city: '',
                  location: null,
                  radiusKm: 10,
                  sortBy: 'newest' as const,
                }),
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map((pack, index) => (
                <PackCardPublic
                  key={pack.id}
                  pack={pack}
                  onReserve={handleReserve}
                  index={index}
                  reserving={null}
                  reservationsEnabled
                />
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
