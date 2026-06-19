'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  Home,
  Package,
  MapPin,
  Calendar,
  Clock,
  Store,
  CheckCircle,
  Shield,
  Star,
  Truck,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import ReservationConfirmation from '@/components/ui/ReservationConfirmation'
import PackPaymentSelector from '@/components/packs/PackPaymentSelector'
import PackReservationModal from '@/components/packs/PackReservationModal'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'

export interface SerializedPack {
  id: string
  title: string
  description: string | null
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

export default function PackDetailClient({ initialPack, packId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [reserving, setReserving] = useState(false)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [lastReservation, setLastReservation] = useState<{
    id: string
    pickup_code: string
    pack: { title: string; image_url: string | null }
    shop: { name: string; address: string | null; phone: string | null }
    pickup_date: string | null
    pickup_start_time: string | null
    pickup_end_time: string | null
  } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'demo'>('cash')
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)

  // React Query con datos iniciales del servidor (SSR + revalidacion en cliente)
  const { data: pack, isLoading: loading } = useQuery({
    queryKey: ['pack-detail', packId],
    queryFn: async () => {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase
        .from('packs')
        .select('*, shop:shops (id, name, description, address, city, phone, logo_url, rating, verified)')
        .eq('id', packId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error || !data) {
        throw new Error('Pack no encontrado')
      }

      return data as unknown as SerializedPack
    },
    initialData: initialPack,
    staleTime: 30 * 1000,
  })

  const handleReserve = () => {
    if (!user) {
      router.push('/login')
      return
    }
    if (!pack) return
    if (!acceptedPolicies) {
      setError('Debes aceptar las politicas de retiro y cancelacion')
      return
    }
    if (quantity > pack.remaining_stock) {
      setError(`Solo quedan ${pack.remaining_stock} unidades disponibles`)
      return
    }
    setShowSummary(true)
  }

  const handleConfirmReservation = async () => {
    if (!pack || !user) return
    setReserving(true)
    setError('')

    try {
      const supabase = supabaseBrowser()
      const { data, error: rpcError } = await supabase.rpc('create_reservation_atomic', {
        p_pack_id: pack.id,
        p_quantity: quantity,
        p_payment_method: paymentMethod,
      })

      if (rpcError) throw rpcError
      if (!data?.success) throw new Error(data?.error || 'Error al crear la reserva')

      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reservation',
            email: user.email,
            data: {
              userName: user.name ?? 'Usuario',
              packTitle: pack.title,
              shopName: pack.shop.name,
              pickupCode: data.pickup_code,
              price: formatPrice(pack.price_cents * quantity),
            },
          }),
        })
      } catch (emailErr) {
        console.error('Error enviando email de confirmacion:', emailErr)
      }

      setLastReservation({
        id: data.reservation_id as string,
        pickup_code: data.pickup_code as string,
        pickup_date: pack.pickup_date,
        pickup_start_time: pack.pickup_start_time,
        pickup_end_time: pack.pickup_end_time,
        pack: { title: pack.title, image_url: pack.image_url },
        shop: { name: pack.shop.name, address: pack.shop.address, phone: pack.shop.phone },
      })
      setShowSummary(false)
      setShowConfirmation(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la reserva')
    } finally {
      setReserving(false)
    }
  }

  const discount = (() => {
    if (!pack?.original_price_cents || pack.original_price_cents <= pack.price_cents) return null
    return Math.round((1 - pack.price_cents / pack.original_price_cents) * 100)
  })()

  const isAvailable = pack?.remaining_stock && pack.remaining_stock > 0 && pack.is_active

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-32 dark:bg-gray-800 bg-gray-200 rounded mb-6" />
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 dark:bg-gray-800 bg-gray-200 rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 w-48 dark:bg-gray-800 bg-gray-200 rounded" />
                <div className="h-4 w-32 dark:bg-gray-800 bg-gray-200 rounded" />
                <div className="h-6 w-24 dark:bg-gray-800 bg-gray-200 rounded" />
                <div className="h-24 w-full dark:bg-gray-800 bg-gray-200 rounded" />
                <div className="h-12 w-full dark:bg-gray-800 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">Pack no encontrado</h1>
          <p className="dark:text-gray-400 text-gray-600 mb-6">El pack que buscas no existe o ya no esta disponible</p>
          <Button onClick={() => router.push('/packs')}>Volver a packs</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-primary transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs dark:text-gray-500 text-gray-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg dark:bg-white/5 bg-gray-100 hover:bg-primary/10"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <Link
              href="/packs"
              className="flex items-center gap-1.5 text-xs dark:text-gray-500 text-gray-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg dark:bg-white/5 bg-gray-100 hover:bg-primary/10"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Packs</span>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative">
            <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden glass-card">
              {pack.image_url ? (
                <Image
                  src={pack.image_url}
                  alt={pack.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <Package className="w-20 h-20 dark:text-gray-500 text-gray-400" />
                </div>
              )}
              {discount && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{discount}%
                </div>
              )}
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold text-white">Agotado</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">{pack.title}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{formatPrice(pack.price_cents)}</span>
                {pack.original_price_cents && (
                  <span className="text-lg text-gray-500 line-through">{formatPrice(pack.original_price_cents)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 dark:text-gray-400 text-gray-500" />
              <span className="dark:text-gray-400 text-gray-600">
                Stock disponible: <span className="text-primary font-semibold">{pack.remaining_stock}</span> /{' '}
                {pack.total_stock} unidades
              </span>
            </div>

            {pack.description && (
              <div className="p-4 glass-card rounded-xl">
                <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Descripcion</h3>
                <p className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed">{pack.description}</p>
              </div>
            )}

            {(pack.pickup_date ?? pack.pickup_start_time) && (
              <div className="p-4 glass-card rounded-xl">
                <h3 className="font-semibold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Informacion de recogida
                </h3>
                <div className="space-y-2 text-sm">
                  {pack.pickup_date && (
                    <div className="flex items-center gap-2 dark:text-gray-400 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(pack.pickup_date)}</span>
                    </div>
                  )}
                  {(pack.pickup_start_time ?? pack.pickup_end_time) && (
                    <div className="flex items-center gap-2 dark:text-gray-400 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {pack.pickup_start_time?.slice(0, 5)} - {pack.pickup_end_time?.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAvailable && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="dark:text-gray-300 text-gray-700">Cantidad:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg dark:bg-gray-800 bg-gray-200 dark:hover:bg-gray-700 hover:bg-gray-300 dark:text-white text-gray-900 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center dark:text-white text-gray-900 font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(pack.remaining_stock, quantity + 1))}
                      className="w-8 h-8 rounded-lg dark:bg-gray-800 bg-gray-200 dark:hover:bg-gray-700 hover:bg-gray-300 dark:text-white text-gray-900 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <PackPaymentSelector paymentMethod={paymentMethod} onChange={setPaymentMethod} />

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies}
                    onChange={() => setAcceptedPolicies(!acceptedPolicies)}
                    className="mt-1 w-4 h-4 accent-primary rounded"
                  />
                  <div className="text-xs dark:text-gray-400 text-gray-600 group-hover:text-gray-300 transition-colors">
                    Acepto las{' '}
                    <Link href="/legal/politicas-retiro" target="_blank" className="text-primary hover:underline">
                      politicas de retiro y cancelacion
                    </Link>
                    . Confirmo que podre recoger el pedido en la fecha y hora indicadas.
                  </div>
                </label>
              </div>
            )}

            {isAvailable ? (
              <Button onClick={handleReserve} disabled={reserving || !acceptedPolicies} className="w-full py-6 text-lg">
                {reserving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reservando...
                  </div>
                ) : (
                  `Reservar Ahora - ${formatPrice(pack.price_cents * quantity)}`
                )}
              </Button>
            ) : (
              <Button disabled className="w-full py-6 text-lg" variant="outline">
                <Package className="w-5 h-5" />
                Agotado
              </Button>
            )}

            <Link href={`/shops/${pack.shop.id}`}>
              <div className="p-4 glass-card rounded-xl cursor-pointer hover:border-primary/50 transition-all group">
                <div className="flex items-center gap-3">
                  {pack.shop.logo_url ? (
                    <Image
                      src={pack.shop.logo_url}
                      alt={pack.shop.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                        {pack.shop.name}
                      </p>
                      {pack.shop.verified && <CheckCircle className="w-4 h-4 text-green-400" />}
                    </div>
                    {pack.shop.address && (
                      <p className="text-xs dark:text-gray-400 text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pack.shop.address}
                        {pack.shop.city && <span className="dark:text-gray-500 text-gray-400">({pack.shop.city})</span>}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 dark:text-gray-400 text-gray-500 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-center gap-4 text-xs dark:text-gray-500 text-gray-400 pt-4">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Pago seguro</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                <span>Recogida local</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span>Comercio verificado</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {showSummary && pack && (
        <PackReservationModal
          pack={pack}
          quantity={quantity}
          paymentMethod={paymentMethod}
          reserving={reserving}
          onClose={() => setShowSummary(false)}
          onConfirm={handleConfirmReservation}
        />
      )}

      {showConfirmation && lastReservation && (
        <ReservationConfirmation
          reservation={lastReservation}
          onClose={() => {
            setShowConfirmation(false)
            router.push('/dashboard')
          }}
        />
      )}

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  )
}
