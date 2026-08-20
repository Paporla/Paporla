'use client'

import { Package, Tag } from 'lucide-react'
import Input from '@/components/ui/Input'
import ImageUpload from '@/components/ui/ImageUpload'

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

export default function PackFormBasicInfo({ data, onChange, shopId, onError }: Props) {
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
          placeholder="Ej: Pack sorpresa del día"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          icon={<Tag className="w-4 h-4" />}
          required
        />

        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={data.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 dark:text-white text-gray-900 dark:placeholder-gray-400 placeholder-gray-400 focus:border-primary focus:outline-none transition-all"
            placeholder="Describe lo que incluye el pack..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Precio (CLP) *"
            type="number"
            step="1"
            min="1"
            placeholder="3990"
            value={data.price_cents || ''}
            onChange={(e) => update({ price_cents: parseInt(e.target.value, 10) || 0 })}
            required
          />

          <Input
            label="Precio original (CLP, opcional)"
            type="number"
            step="1"
            min="0"
            placeholder="7990"
            value={data.original_price_cents || ''}
            onChange={(e) => update({ original_price_cents: e.target.value ? parseInt(e.target.value, 10) || 0 : 0 })}
          />

          <Input
            label="Stock disponible *"
            type="number"
            placeholder="10"
            value={data.total_stock}
            onChange={(e) => update({ total_stock: parseInt(e.target.value, 10) || 0 })}
            icon={<Package className="w-4 h-4" />}
            required
          />
        </div>

        <p className="text-xs dark:text-gray-500 text-gray-500">
          Precio en pesos chilenos enteros, sin decimales ni símbolo $. Chile no usa céntimos.
        </p>

        {discount && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
            <Tag className="w-4 h-4" />
            <span>Descuento aplicado: {discount}%</span>
          </div>
        )}

        <ImageUpload
          bucket="pack-images"
          path={`${shopId}/packs`}
          existingImage={data.image_url || null}
          onUploadComplete={(url) => update({ image_url: url })}
          onError={onError}
          label="Foto del pack (opcional en borrador; luego podrá usarse la del comercio)"
        />
      </div>
    </div>
  )
}
