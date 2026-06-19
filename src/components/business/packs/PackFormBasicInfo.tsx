'use client'

import { Package, DollarSign, Tag } from 'lucide-react'
import Input from '@/components/ui/Input'

// Elimina la importación de ImageUpload

interface BasicData {
  title: string
  description: string
  price_cents: number
  original_price_cents: number
  total_stock: number
  image_url: string
}

interface Props {
  data: BasicData
  onChange: (data: BasicData) => void
  shopId: string
  onError: (err: string) => void
}

export default function PackFormBasicInfo({ data, onChange, shopId: _shopId, onError: _onError }: Props) {
  const update = (partial: Partial<BasicData>) => onChange({ ...data, ...partial })

  const discount =
    data.original_price_cents > data.price_cents
      ? Math.round((1 - data.price_cents / data.original_price_cents) * 100)
      : null

  return (
    <div className="dark:bg-black/40 bg-white dark:backdrop-blur-sm backdrop-blur-sm rounded-2xl p-6 border dark:border-white/10 border-gray-200">
      <h2 className="text-lg font-semibold dark:text-white text-gray-900 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Información del Pack
      </h2>

      <div className="space-y-4">
        <Input
          label="Título del pack *"
          placeholder="Ej: Pack Sorpresa Vegano"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          icon={<Tag className="w-4 h-4" />}
          required
        />

        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-2">
            Descripcion (opcional)
          </label>
          <textarea
            value={data.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 dark:text-white text-gray-900 dark:placeholder-gray-500 placeholder-gray-400 focus:border-primary focus:outline-none transition-all"
            placeholder="Describe lo que incluye el pack..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Precio (USD) *"
            type="number"
            step="0.01"
            placeholder="9.99"
            value={data.price_cents / 100}
            onChange={(e) => update({ price_cents: Math.round(parseFloat(e.target.value ?? '0') * 100) })}
            icon={<DollarSign className="w-4 h-4" />}
            required
          />

          <Input
            label="Precio original (opcional)"
            type="number"
            step="0.01"
            placeholder="24.99"
            value={data.original_price_cents / 100 || ''}
            onChange={(e) =>
              update({ original_price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 })
            }
            icon={<DollarSign className="w-4 h-4" />}
          />

          <Input
            label="Stock disponible *"
            type="number"
            placeholder="10"
            value={data.total_stock}
            onChange={(e) => update({ total_stock: parseInt(e.target.value) || 0 })}
            icon={<Package className="w-4 h-4" />}
            required
          />
        </div>

        {discount && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
            <Tag className="w-4 h-4" />
            <span>Descuento aplicado: {discount}%</span>
          </div>
        )}

        {/* Eliminado ImageUpload - la imagen se usará del perfil del comercio */}
      </div>
    </div>
  )
}
