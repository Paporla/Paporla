'use client'

import { CreditCard } from 'lucide-react'

interface PackPaymentSelectorProps {
  paymentMethod: 'cash' | 'demo'
  onChange: (method: 'cash' | 'demo') => void
}

export default function PackPaymentSelector({ paymentMethod, onChange }: PackPaymentSelectorProps) {
  const options: Array<{ value: 'cash' | 'demo'; label: string; description: string }> = [
    { value: 'cash', label: 'Efectivo', description: 'Paga al recoger en el comercio' },
    { value: 'demo', label: 'Demo', description: 'Confirmacion de prueba (sin pago real)' },
  ]

  return (
    <div className="p-4 glass-card rounded-xl">
      <h3 className="font-semibold dark:text-white text-gray-900 mb-3 flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        Metodo de pago
      </h3>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 cursor-pointer hover:border-primary/50 transition-all has-checked:border-primary has-checked:bg-primary/10"
          >
            <input
              type="radio"
              name="payment"
              value={opt.value}
              checked={paymentMethod === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex-1">
              <p className="dark:text-white text-gray-900 text-sm font-medium">{opt.label}</p>
              <p className="text-xs dark:text-gray-500 text-gray-400">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
