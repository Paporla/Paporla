'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePublicPacks } from '@/hooks/usePublicPacks'
import { useCreateReservation } from '@/hooks/useCreateReservation'
import { trackViewPackList } from '@/lib/analytics/events'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'
import PackCardPublic from '@/components/packs/PackCardPublic'
import PackReservationModal from '@/components/packs/PackReservationModal'
import ReservationConfirmation from '@/components/ui/ReservationConfirmation'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'
import PacksHeroSection from '@/components/packs/PacksHeroSection'
import OnboardingSteps from '@/components/packs/OnboardingSteps'
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid'

const ITEMS_PER_PAGE = 9

export default function PacksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { packs, filters, loading, error: hookError, setError, setFilters } = usePublicPacks()
  const {
    createReservation,
    lastReservation,
    loading: reserving,
    error: reserveError,
    clearError: clearReserveError,
    clearLastReservation,
  } = useCreateReservation()

  const [currentPage, setCurrentPage] = useState(1)
  const [reservedFromRedirect, setReservedFromRedirect] = useState(false)

  // Estados para el flujo de reserva con modales
  const [showSummary, setShowSummary] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedPack, setSelectedPack] = useState<{
    id: string
    title: string
    image_url: string | null
    price_cents: number
    shop_id: string
    shop_name: string
    shop_address: string | null
    shop_phone: string | null
    pickup_date: string | null
    pickup_start_time: string | null
    pickup_end_time: string | null
  } | null>(null)

  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPacks = useMemo(() => packs.slice(startIndex, startIndex + ITEMS_PER_PAGE), [packs, startIndex])

  const handleFilterChange = (f: Parameters<typeof setFilters>[0]) => {
    setFilters(f)
    setCurrentPage(1)
  }

  /**
   * Paso 1: Usuario hace clic en "Reservar ahora" en una card.
   * Si no está autenticado, redirige a login con retorno.
   * Si está autenticado, abre el modal de pre-confirmación.
   */
  const handleReserve = (packId: string) => {
    if (!user) {
      router.push(`/login?redirect=/packs&reserve=${packId}`)
      return
    }

    const pack = packs.find((p) => p.id === packId)
    if (!pack) {
      setError('Pack no encontrado')
      return
    }

    setSelectedPack({
      id: pack.id,
      title: pack.title,
      image_url: pack.image_url,
      price_cents: pack.price_cents,
      shop_id: pack.shop_id,
      shop_name: pack.shop_name,
      shop_address: null, // available_packs no incluye address, lo aceptamos
      shop_phone: null,
      pickup_date: null, // se obtienen del detalle si es necesario
      pickup_start_time: null,
      pickup_end_time: null,
    })

    setShowSummary(true)
  }

  /**
   * Paso 2: Usuario confirma en el modal → se ejecuta la reserva vía RPC.
   */
  const handleConfirmReservation = async () => {
    if (!selectedPack || !user) return

    const result = await createReservation(
      {
        packId: selectedPack.id,
        quantity: 1,
        paymentMethod: 'cash',
      },
      {
        title: selectedPack.title,
        image_url: selectedPack.image_url,
        price_cents: selectedPack.price_cents,
        shop: {
          name: selectedPack.shop_name,
          address: selectedPack.shop_address,
          phone: selectedPack.shop_phone,
        },
        pickup_date: selectedPack.pickup_date,
        pickup_start_time: selectedPack.pickup_start_time,
        pickup_end_time: selectedPack.pickup_end_time,
      },
    )

    if (result) {
      setShowSummary(false)
      setShowConfirmation(true)
    }
  }

  /**
   * Cierra los modales y limpia el estado.
   */
  const handleCloseConfirmation = () => {
    setShowConfirmation(false)
    clearLastReservation()
    setSelectedPack(null)
  }

  const handleCloseSummary = () => {
    setShowSummary(false)
    setSelectedPack(null)
  }

  // Analytics: trackear vista de página de packs
  useEffect(() => {
    if (!loading && packs.length >= 0) {
      trackViewPackList(packs.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Auto-reservar cuando el usuario vuelve tras login/registro con ?reserve=PACK_ID
  useEffect(() => {
    const reservePackId = searchParams.get('reserve')
    if (!reservePackId || !user || reservedFromRedirect || loading) return

    const pack = packs.find((p) => p.id === reservePackId)
    if (!pack) return

    setReservedFromRedirect(true)
    // Limpiar el param de la URL sin recargar
    const url = new URL(window.location.href)
    url.searchParams.delete('reserve')
    window.history.replaceState({}, '', url.toString())
    // En vez de auto-reservar, mostramos el modal de confirmación
    handleReserve(reservePackId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, packs, loading])

  if (loading) return <PacksLoadingGrid />

  return (
    <div className="min-h-screen">
      <PacksHeroSection count={packs.length} />

      <div className="container mx-auto px-4 py-8">
        <OnboardingSteps />
        <PackFiltersAdvanced onFilterChange={handleFilterChange} />

        {!loading && packs.length === 0 ? (
          <EmptyState
            type={filters.city || filters.search ? 'search' : 'packs'}
            title={
              filters.city
                ? `No hay packs en ${filters.city}`
                : filters.search
                  ? `No encontramos "${filters.search}"`
                  : undefined
            }
            description={
              filters.city
                ? 'Prueba buscando en otra ciudad o explorando todos los packs disponibles.'
                : filters.minPrice > 0 || filters.maxPrice < 100000
                  ? 'Prueba ajustando el rango de precios o desactivando algunos filtros.'
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map((pack, idx) => (
                <PackCardPublic
                  key={pack.id}
                  pack={pack}
                  onReserve={handleReserve}
                  index={idx}
                  reserving={reserving ? pack.id : null}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </div>

      {/* Modal de pre-confirmación */}
      {showSummary && selectedPack && (
        <PackReservationModal
          pack={{
            id: selectedPack.id,
            title: selectedPack.title,
            image_url: selectedPack.image_url,
            price_cents: selectedPack.price_cents,
            shop: { name: selectedPack.shop_name, address: selectedPack.shop_address },
            pickup_date: selectedPack.pickup_date,
            pickup_start_time: selectedPack.pickup_start_time,
            pickup_end_time: selectedPack.pickup_end_time,
          }}
          quantity={1}
          paymentMethod="cash"
          reserving={reserving}
          onClose={handleCloseSummary}
          onConfirm={handleConfirmReservation}
        />
      )}

      {/* Modal de confirmación post-reserva */}
      {showConfirmation && lastReservation && (
        <ReservationConfirmation
          reservation={{
            id: lastReservation.id,
            pickup_code: lastReservation.pickup_code,
            pack: lastReservation.pack,
            shop: lastReservation.shop,
            pickup_date: lastReservation.pickup_date,
            pickup_start_time: lastReservation.pickup_start_time,
            pickup_end_time: lastReservation.pickup_end_time,
          }}
          onClose={handleCloseConfirmation}
        />
      )}

      {hookError && <Toast message={hookError} type="error" onClose={() => setError('')} />}
      {reserveError && <Toast message={reserveError} type="error" onClose={clearReserveError} />}
    </div>
  )
}
