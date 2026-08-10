'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils/formatPrice'
import type { UserProfile } from '@/types/user'

interface PackPaymentPanelProps {
  packId: string
  user: UserProfile | null
  isAvailable: boolean
  remainingStock: number
  priceCents: number
  onReserve: (quantity: number, paymentMethod: 'cash' | 'demo', acceptedPolicies: boolean) => void
  reserving: boolean
}

export default function PackPaymentPanel({
  packId: _packId,
  user,
  isAvailable,
  remainingStock,
  priceCents,
  onReserve,
  reserving,
}: PackPaymentPanelProps) {
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'demo'>('cash')
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)

  const handleReserve = () => {
    if (!user) return
    onReserve(quantity, paymentMethod, acceptedPolicies)
  }

  return (
    <div className="space-y-5">
      {/* Selector de cantidad */}
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
            onClick={() => setQuantity(Math.min(remainingStock, quantity + 1))}
            className="w-8 h-8 rounded-lg dark:bg-gray-800 bg-gray-200 dark:hover:bg-gray-700 hover:bg-gray-300 dark:text-white text-gray-900 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Metodo de pago */}
      <div className="p-4 glass-card rounded-xl">
        <h3 className="font-semibold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Metodo de pago
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 cursor-pointer hover:border-primary/50 transition-all has-checked:border-primary has-checked:bg-primary/10">
            <input
              type="radio"
              name="payment"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex-1">
              <p className="dark:text-white text-gray-900 text-sm font-medium">Efectivo</p>
              <p className="text-xs dark:text-gray-500 text-gray-400">Paga al recoger en el comercio</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 cursor-pointer hover:border-primary/50 transition-all has-checked:border-primary has-checked:bg-primary/10">
            <input
              type="radio"
              name="payment"
              value="demo"
              checked={paymentMethod === 'demo'}
              onChange={() => setPaymentMethod('demo')}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex-1">
              <p className="dark:text-white text-gray-900 text-sm font-medium">Demo</p>
              <p className="text-xs dark:text-gray-500 text-gray-400">Confirmacion de prueba (sin pago real)</p>
            </div>
          </label>
        </div>
      </div>

      {/* Politicas */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={acceptedPolicies}
          onChange={() => setAcceptedPolicies(!acceptedPolicies)}
          className="mt-1 w-4 h-4 accent-primary rounded"
        />
        <div className="text-xs dark:text-gray-400 text-gray-600 group-hover:dark:text-gray-300 group-hover:text-gray-500 transition-colors">
          Acepto las{' '}
          <Link href="/legal/politicas-retiro" target="_blank" className="text-primary hover:underline">
            politicas de retiro y cancelacion
          </Link>
          . Confirmo que podre recoger el pedido en la fecha y hora indicadas.
        </div>
      </label>

      {isAvailable ? (
        <Button onClick={handleReserve} disabled={reserving || !acceptedPolicies} className="w-full py-6 text-lg">
          {reserving ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Reservando...
            </div>
          ) : (
            `Reservar Ahora - ${formatPrice(priceCents * quantity)}`
          )}
        </Button>
      ) : (
        <Button disabled className="w-full py-6 text-lg" variant="outline">
          <Package className="w-5 h-5" />
          Agotado
        </Button>
      )}
    </div>
  )
}
