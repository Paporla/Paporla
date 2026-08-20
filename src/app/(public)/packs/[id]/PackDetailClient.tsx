'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Star,
  Truck,
  ExternalLink,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import ShareButton from '@/components/ui/ShareButton'

export interface SerializedPack {
  id: string
  title: string
  description: string | null
  allergen_notice: string | null
  price_cents: number
  original_price_cents: number | null
  total_stock: number
  remaining_stock: number
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  ends_at: string | null
  image_url: string | null
  is_active: boolean
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
  packId: string
}

function formatPickup(endsAt: string | null) {
  if (!endsAt) return null
  try {
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santiago',
    }).format(new Date(endsAt))
  } catch {
    return null
  }
}

export default function PackDetailClient({ initialPack }: Props) {
  const router = useRouter()
  const pack = initialPack
  const priceLabel = (n: number) => formatMinorPrice(n, 'CLP', 'es-CL')
  const hasDiscount = pack.original_price_cents != null && pack.original_price_cents > pack.price_cents
  const discount = hasDiscount ? Math.round((1 - pack.price_cents / pack.original_price_cents!) * 100) : null
  const pickupLabel = formatPickup(pack.ends_at)

  if (!pack?.id) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pack no encontrado</h1>
        <Button onClick={() => router.push('/packs')}>Volver a packs</Button>
      </div>
    )
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
                  <span className="text-3xl font-bold text-primary">{priceLabel(pack.price_cents)}</span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-500 line-through">{priceLabel(pack.original_price_cents!)}</span>
                  )}
                </div>
                <ShareButton
                  title={`${pack.title} — Paporla`}
                  text={`Pack ${pack.title} por ${priceLabel(pack.price_cents)} en ${pack.shop.name}.`}
                  variant="icon"
                />
              </div>
            </div>

            <p className="text-sm dark:text-gray-400 text-gray-600">
              Stock: <span className="text-primary font-semibold">{pack.remaining_stock}</span> / {pack.total_stock}
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

            {pickupLabel && (
              <div className="p-4 glass-card rounded-xl flex items-center gap-2 text-sm dark:text-gray-300 text-gray-700">
                <Clock className="w-4 h-4 text-primary" />
                Recogida: {pickupLabel}
              </div>
            )}

            <Button disabled className="w-full py-6 text-lg">
              Reservas próximamente
            </Button>

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
                <Shield className="w-3 h-3" /> Pago seguro
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" /> Recogida local
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" /> Comercio verificado
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
