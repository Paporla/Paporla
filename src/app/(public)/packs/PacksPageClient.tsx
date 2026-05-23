'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { usePublicPacks } from '@/components/packs/usePublicPacks'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'
import PackCardPublic from '@/components/packs/PackCardPublic'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import Toast from '@/components/ui/Toast'
import PacksHeroSection from '@/components/packs/PacksHeroSection'
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid'
import { formatPrice } from '@/lib/utils/formatPrice'

const ITEMS_PER_PAGE = 9

export default function PacksPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const { packs, loading, error, setError, setFilters } = usePublicPacks()
  const [currentPage, setCurrentPage] = useState(1)
  const [reserving, setReserving] = useState<string | null>(null)

  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentPacks = useMemo(() => packs.slice(startIndex, startIndex + ITEMS_PER_PAGE), [packs, startIndex])

  const handleFilterChange = (f: Parameters<typeof setFilters>[0]) => {
    setFilters(f)
    setCurrentPage(1)
  }

  const handleReserve = async (packId: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    setReserving(packId)
    setError('')

    try {
      const { data, error: rpcError } = await supabase.rpc('create_reservation_atomic', {
        p_pack_id: packId,
        p_quantity: 1,
        p_payment_method: 'cash',
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Error al reservar')

      // Enviar email de confirmacion
      try {
        const pack = packs.find((p) => p.id === packId)
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reservation',
            email: user.email,
            data: {
              userName: user.name || 'Usuario',
              packTitle: pack?.title || 'Pack',
              shopName: pack?.shop_name || 'Comercio',
              pickupCode: data.pickup_code,
              price: pack ? formatPrice(pack.price_cents) : '',
            },
          }),
        })
      } catch (emailErr) {
        console.error('Error enviando email:', emailErr)
      }

      router.push('/dashboard?reserved=true')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al realizar la reserva')
    } finally {
      setReserving(null)
    }
  }

  if (loading) return <PacksLoadingGrid />

  return (
    <div className="min-h-screen dark:bg-black bg-gray-50">
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

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  )
}
