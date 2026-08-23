'use client'

import { useState } from 'react'
import Image from 'next/image'
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
  onFileChosen?: (file: File) => void
  /*
   * En edicion el stock NO se toca desde aqui. update_pack_content (0009) no
   * actualiza total_stock: de eso se encarga adjust_pack_stock, que bloquea la
   * fila y rechaza bajar por debajo de las unidades ya comprometidas. Dejar el
   * campo editable haria creer que el cambio se guarda cuando se descarta en
   * silencio, asi que se muestra en solo lectura.
   */
  stockReadOnly?: boolean
  /*
   * URL publica de la foto por defecto que el comercio configuro en su perfil.
   * Cuando existe, el campo de subida se pliega detras de un enlace: el caso
   * normal es no subir nada, y un formulario mas corto es un pack publicado
   * antes. Se sigue pudiendo abrir para destacar un pack concreto.
   */
  defaultImageUrl?: string | null
}

export default function PackFormBasicInfo({
  data,
  onChange,
  shopId,
  onError,
  onFileChosen,
  stockReadOnly = false,
  defaultImageUrl,
}: Props) {
  const update = (partial: Partial<BasicData>) => onChange({ ...data, ...partial })

  /* Ya hay una imagen elegida para este pack: entonces no se pliega nada. */
  const hasOwnImage = !!data.image_url
  const canCollapse = !!defaultImageUrl && !hasOwnImage
  const [showUpload, setShowUpload] = useState(false)

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

          {stockReadOnly ? (
            <div>
              <Input
                label="Stock total"
                type="number"
                value={data.total_stock}
                readOnly
                disabled
                icon={<Package className="w-4 h-4" />}
                className="opacity-60 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs dark:text-gray-500 text-gray-500">
                El stock se ajusta desde el listado de packs, no aquí.
              </p>
            </div>
          ) : (
            <Input
              label="Stock disponible *"
              type="number"
              placeholder="10"
              value={data.total_stock}
              onChange={(e) => update({ total_stock: parseInt(e.target.value, 10) || 0 })}
              icon={<Package className="w-4 h-4" />}
              required
            />
          )}
        </div>

        <p className="text-xs dark:text-gray-500 text-gray-500">
          Precio en pesos chilenos enteros, sin decimales. Chile no usa céntimos.
        </p>

        {discount && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
            <Tag className="w-4 h-4" />
            <span>Descuento aplicado: {discount}%</span>
          </div>
        )}

        {canCollapse && !showUpload ? (
          <div className="flex items-center gap-3 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3">
            {/*
              Miniatura de la foto del perfil: confirma de un vistazo con que
              imagen saldra el pack, sin ocupar el espacio de un campo entero.
              Es decorativa, el texto de al lado ya lo explica.
            */}
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
              <Image src={defaultImageUrl as string} alt="" fill className="object-cover" sizes="56px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm dark:text-gray-300 text-gray-700">Se usará la foto por defecto de tus packs.</p>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="text-sm text-primary hover:underline"
              >
                Usar otra foto solo para este pack
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload
            bucket="pack-images"
            path={`${shopId}/pending`}
            deferUpload
            onFileChosen={onFileChosen}
            existingImage={data.image_url || null}
            onUploadComplete={(url) => update({ image_url: url })}
            onError={onError}
            label={canCollapse ? 'Foto solo para este pack' : 'Foto del pack'}
          />
        )}
      </div>
    </div>
  )
}
