'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePacks } from '@/hooks/usePacks'
import { Package, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import QuickReserveFlow from '@/components/reservations/QuickReserveFlow'
import { formatPrice } from '@/lib/utils/formatPrice'
import type { PackWithShop } from '@/types/pack'

interface PackDetailActionsProps {
  packId: string
  shopId: string
  priceCents: number
  remainingStock: number
  isActive: boolean
  onSuccess?: () => void
}

export default function PackDetailActions({
  packId,
  priceCents,
  remainingStock,
  isActive,
  onSuccess,
}: PackDetailActionsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { getPackById } = usePacks()
  const [showReserveFlow, setShowReserveFlow] = useState(false)
  const [packData, setPackData] = useState<PackWithShop | null>(null)
  const [loadingPack, setLoadingPack] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReserveClick = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setLoadingPack(true)
    setError(null)

    try {
      const data = await getPackById(packId)

      if (!data) {
        setError('Error al cargar el pack')
        setLoadingPack(false)
        return
      }

      if (data.pickup_date && data.pickup_end_time) {
        const pickupDateTime = new Date(`${data.pickup_date}T${data.pickup_end_time}`)
        const now = new Date()

        if (pickupDateTime < now) {
          setError('Este pack ya expiró. No puedes reservarlo.')
          setLoadingPack(false)
          return
        }
      }

      setPackData(data)
      setShowReserveFlow(true)
    } catch {
      setError('Error al cargar el pack')
    } finally {
      setLoadingPack(false)
    }
  }

  if (!isActive || remainingStock <= 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-white/10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-gray-400 py-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">No disponible</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-white/10 z-40">
        <div className="max-w-md mx-auto">
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}
          <Button
            onClick={handleReserveClick}
            disabled={loadingPack}
            className="w-full py-4 text-lg font-bold shadow-lg shadow-primary/20"
          >
            {loadingPack ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cargando...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Package className="w-5 h-5" />
                Reservar Ahora - {formatPrice(priceCents)}
              </div>
            )}
          </Button>
        </div>
      </div>
      {showReserveFlow && packData && (
        <QuickReserveFlow
          pack={packData}
          onClose={() => {
            setShowReserveFlow(false)
            setPackData(null)
          }}
          onSuccess={() => {
            setShowReserveFlow(false)
            setPackData(null)
            if (onSuccess) onSuccess()
          }}
        />
      )}
    </>
  )
}
