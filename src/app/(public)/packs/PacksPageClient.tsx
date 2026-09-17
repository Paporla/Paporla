'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { usePublicPacks } from '@/hooks/usePublicPacks'
import { trackViewPackList, trackClickReserve } from '@/lib/analytics/events'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'
import PackCardPublic from '@/components/packs/PackCardPublic'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import PacksHeroSection from '@/components/packs/PacksHeroSection'
import OnboardingSteps from '@/components/packs/OnboardingSteps'
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid'

const ITEMS_PER_PAGE = 9

export default function PacksPage() {
  const { packs, filters, loading, error: hookError, setFilters, retry, localities } = usePublicPacks()
  const cityNames = useMemo(() => localities.map((l) => l.name), [localities])
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  /*
   * L-22 (empty states honestos): "no hay nada" no es lo mismo que "está
   * roto", y "no hay nada con TUS filtros" tampoco. Tres verdades distintas,
   * tres mensajes distintos — antes cualquier catálogo vacío caía en el
   * mensaje de lanzamiento y un fallo de red se veía como "aún no hay packs".
   */
  const hasActiveFilters = Boolean(
    filters.city ||
    filters.search ||
    filters.showAvailableOnly ||
    filters.minPrice > 0 ||
    filters.maxPrice < 100000 ||
    filters.location,
  )

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

  /**
   * BUG DEL BUSCADOR QUE SE REINICIA (L-05, reportado por el fundador el
   * 2026-09-10): antes, `if (loading) return <PacksLoadingGrid />` sustituía
   * la página ENTERA por el esqueleto en cada carga. El texto del buscador
   * vive en el estado local del panel de filtros, así que al teclear:
   * letra → debounce → nueva query → loading → se desmonta el panel → al
   * volver a montarse, la caja llegaba vacía ("salto de página y vuelve a
   * aparecer como estaba"). Ahora el esqueleto ocupa SOLO el área de
   * resultados: héroe, onboarding y filtros siguen montados mientras carga.
   */
  return (
    <div className="min-h-screen">
      <PacksHeroSection count={packs.length} />

      <div className="container mx-auto px-4 py-8">
        <OnboardingSteps />
        {/*
          El desplegable de ciudades sale de la base de datos. Sin esta prop el
          componente usaba su valor por defecto: `cities = ['Santiago']` escrito
          a mano, que es justo lo que impedía crecer a otras comunas.
        */}
        <PackFiltersAdvanced onFilterChange={handleFilterChange} cities={cityNames} />

        {loading ? (
          <PacksLoadingGrid />
        ) : hookError ? (
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar el catálogo"
            description="Algo falló al consultar los packs disponibles. No es que no haya nada: es que no pudimos mirarlo. Inténtalo otra vez."
            action={{ label: 'Reintentar', onClick: retry }}
          />
        ) : packs.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              type={filters.city || filters.search ? 'search' : 'filters'}
              title={
                filters.city
                  ? `No hay packs en ${filters.city}`
                  : filters.search
                    ? `No encontramos "${filters.search}"`
                    : undefined
              }
              description={
                filters.city
                  ? 'Prueba buscando en otra localidad o explora todos los packs.'
                  : filters.search
                    ? 'Prueba con otra búsqueda o limpia los filtros.'
                    : undefined
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
            <EmptyState
              type="packs"
              title="No hay packs a la venta ahora mismo"
              description="Los comercios publican sus packs sorpresa por tiempo limitado y se agotan rápido. Vuelve pronto: el catálogo se renueva cada día."
            />
          )
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
    </div>
  )
}
