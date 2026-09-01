'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Home,
  Package,
  MapPin,
  Clock,
  Store,
  CheckCircle,
  Shield,
  Truck,
  ExternalLink,
  Wallet,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import ShareButton from '@/components/ui/ShareButton'
import ReserveModal from './components/ReserveModal'
import { useAuth } from '@/hooks/useAuth'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { getReserveBlockReason, formatPickupWindow } from '@/lib/utils/reserve'
import { trackClickReserve } from '@/lib/analytics/events'

export interface SerializedPack {
  id: string
  title: string
  description: string | null
  allergen_notice: string | null
  category: string
  price_minor: number
  original_price_minor: number | null
  currency_code: string
  remaining_stock: number
  /** Ventana de recogida, ISO 8601 (NOT NULL en packs, 0004). */
  pickup_start_at: string
  pickup_end_at: string
  timezone: string
  image_url: string | null
  shop_id: string
  shop: {
    id: string
    name: string
    description: string | null
    address: string | null
    city: string | null
    phone: string | null
    logo_url: string | null
    rating: number | null
    verified: boolean
  }
}

interface Props {
  initialPack: SerializedPack
}

/** El botón deshabilitado SIEMPRE explica por qué (regla del proyecto). */
const BLOCK_TEXT: Record<string, { label: string; reason: string }> = {
  'sold-out': {
    label: 'Agotado',
    reason: 'Se agotó el stock de este pack. Los comercios publican nuevos packs todos los días.',
  },
  'window-passed': {
    label: 'Reservas cerradas',
    reason: 'La ventana de retiro de este pack ya terminó o está a punto de cerrar.',
  },
}

export default function PackDetailClient({ initialPack }: Props) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [reserveOpen, setReserveOpen] = useState(false)

  const pack = initialPack
  const priceLabel = (n: number) => formatMinorPrice(n, pack.currency_code, 'es-CL')
  const hasDiscount = pack.original_price_minor != null && pack.original_price_minor > pack.price_minor
  const discount = hasDiscount ? Math.round((1 - pack.price_minor / pack.original_price_minor!) * 100) : null
  const pickupWindow = formatPickupWindow(pack.pickup_start_at, pack.pickup_end_at, pack.timezone)
  const blockReason = getReserveBlockReason({ remainingStock: pack.remaining_stock, pickupEndAt: pack.pickup_end_at })

  if (!pack?.id) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pack no encontrado</h1>
        <Button onClick={() => router.push('/packs')}>Volver a packs</Button>
      </div>
    )
  }

  /**
   * Clic en "Reservar":
   *  - Sin sesión → a login con redirect de vuelta a este mismo pack
   *    (useAuth.signIn respeta el parámetro ?redirect=/).
   *  - Con sesión → abre el modal de confirmación.
   * El evento click_reserve del funnel se dispara en los dos casos.
   */
  const handleReserve = () => {
    if (blockReason || authLoading) return
    trackClickReserve(pack.id, pack.title, pack.price_minor, pack.currency_code)
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/packs/${pack.id}`)}`)
      return
    }
    setReserveOpen(true)
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg dark:bg-white/5 bg-gray-100"
            >
              <Home className="w-3.5 h-3.5" /> Inicio
            </Link>
            <Link
              href="/packs"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg dark:bg-white/5 bg-gray-100"
            >
              <Package className="w-3.5 h-3.5" /> Packs
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative">
            <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden glass-card">
              {pack.image_url ? (
                <Image src={pack.image_url} alt={pack.title} fill className="object-cover" sizes="50vw" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 dark:text-gray-500 text-gray-400" />
                </div>
              )}
              {discount && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{discount}%
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">{pack.title}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">{priceLabel(pack.price_minor)}</span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-500 line-through">{priceLabel(pack.original_price_minor!)}</span>
                  )}
                </div>
                <ShareButton
                  title={`${pack.title} — Paporla`}
                  text={`Pack ${pack.title} por ${priceLabel(pack.price_minor)} en ${pack.shop.name}.`}
                  variant="icon"
                />
              </div>
            </div>

            <p className="text-sm dark:text-gray-400 text-gray-600">
              {pack.remaining_stock === 1 ? 'Queda' : 'Quedan'}{' '}
              <span className="text-primary font-semibold">{pack.remaining_stock}</span> en stock
            </p>

            {pack.description && (
              <div className="p-4 glass-card rounded-xl">
                <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Descripción</h3>
                <p className="text-sm dark:text-gray-400 text-gray-600">{pack.description}</p>
              </div>
            )}

            {pack.allergen_notice && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <h3 className="font-semibold dark:text-white text-gray-900 mb-1">Alérgenos</h3>
                <p className="text-sm dark:text-amber-100 text-amber-900">{pack.allergen_notice}</p>
              </div>
            )}

            {pickupWindow && (
              <div className="p-4 glass-card rounded-xl flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                <Clock className="w-4 h-4 text-primary" />
                Recogida: {pickupWindow}
              </div>
            )}

            <div>
              <Button
                onClick={handleReserve}
                disabled={!!blockReason}
                loading={authLoading}
                className="w-full py-6 text-lg"
              >
                {blockReason ? BLOCK_TEXT[blockReason].label : 'Reservar'}
              </Button>
              {blockReason && (
                <p className="text-xs text-center dark:text-gray-500 text-gray-400 mt-2">
                  {BLOCK_TEXT[blockReason].reason}
                </p>
              )}
            </div>

            <Link href={`/shops/${pack.shop.id}`}>
              <div className="p-4 glass-card rounded-xl hover:border-primary/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold dark:text-white text-gray-900 flex items-center gap-2">
                      {pack.shop.name}
                      {pack.shop.verified && <CheckCircle className="w-4 h-4 text-green-400" />}
                    </p>
                    {pack.shop.city && (
                      <p className="text-xs dark:text-gray-400 text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pack.shop.city}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 dark:text-gray-400" />
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-center gap-4 text-xs dark:text-gray-500 text-gray-400 pt-2">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Sin cobro por ahora
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" /> Recogida local
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Comercio verificado
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <ReserveModal isOpen={reserveOpen} onClose={() => setReserveOpen(false)} pack={pack} />
    </div>
  )
}
