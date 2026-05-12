'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Package, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import QuickReserveFlow from '@/components/reservations/QuickReserveFlow'
import { formatPrice } from '@/lib/utils/formatPrice'

interface PackMinData {
  id: string
  title: string
  description: string | null
  price_cents: number
  image_url: string | null
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  remaining_stock: number
  shop_id: string
  shop: {
    id: string
    name: string
    address: string | null
    phone: string | null
  }
}

interface PackDetailActionsProps {
  packId: string
  shopId: string
  priceCents: number
  remainingStock: number
  isActive: boolean
  onSuccess?: () => void
}

export default function PackDetailActions({
  packId, priceCents, remainingStock, isActive, onSuccess
}: PackDetailActionsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = supabaseBrowser()
  const [showReserveFlow, setShowReserveFlow] = useState(false)
  const [packData, setPackData] = useState<PackMinData | null>(null)
  const [loadingPack, setLoadingPack] = useState(false)

  const handleReserveClick = async () => {
    if (!user) { router.push('/login'); return }
    setLoadingPack(true)
    const { data } = await supabase
      .from('packs')
      .select('id, title, description, price_cents, image_url, pickup_date, pickup_start_time, pickup_end_time, remaining_stock, shop_id, shop:shops(id, name, address, phone)')
      .eq('id', packId)
      .single()
    if (data) {
      setPackData(data as unknown as PackMinData)
      setShowReserveFlow(true)
    }
    setLoadingPack(false)
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
          <Button onClick={handleReserveClick} disabled={loadingPack} className="w-full py-4 text-lg font-bold shadow-lg shadow-primary/20">
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
          onClose={() => { setShowReserveFlow(false); setPackData(null) }}
          onSuccess={() => { setShowReserveFlow(false); setPackData(null); if (onSuccess) onSuccess() }}
        />
      )}
    </>
  )
}
