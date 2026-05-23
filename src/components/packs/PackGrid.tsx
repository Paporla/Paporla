'use client'

import PackCard from './PackCard'
import PackGridSkeleton from './PackGridSkeleton'
import { PackWithShop } from '@/types/pack'

interface PackGridProps {
  packs: PackWithShop[]
  loading?: boolean
  onReserve?: (packId: string) => void
  showShopName?: boolean
  glassCard?: boolean
}

export default function PackGrid({ packs, loading, onReserve, showShopName = true, glassCard = false }: PackGridProps) {
  if (loading) {
    return <PackGridSkeleton />
  }

  if (packs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="glass-card rounded-xl p-8 max-w-md mx-auto">
          <p className="text-gray-400">No hay packs disponibles por ahora.</p>
          <p className="text-sm text-gray-500 mt-2">Vuelve más tarde para ver nuevas opciones.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} onReserve={onReserve} showShopName={showShopName} glass={glassCard} />
      ))}
    </div>
  )
}
