'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertCircle, CheckCircle } from 'lucide-react'
import { logger } from '@/lib/logger'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'
import PackCategoryTemplates from './packs/PackCategoryTemplates'
import PackFormBasicInfo from './packs/PackFormBasicInfo'
import PackFormPickupTime from './packs/PackFormPickupTime'
import {
  PackFormData,
  PackContentExtras,
  validatePackForm,
  getDefaultPackData,
  packToFormData,
  buildPackContentParams,
} from '@/lib/utils/packForm'

/*
 * Contrato que la pantalla que monta el formulario debe entregar.
 *
 * Los nombres son de INTERFAZ (price_cents, pickup_date, image_url), no de la
 * tabla packs. La pantalla de edicion traduce la fila real en toFormPack().
 *
 * image_url es la URL publica ya resuelta, para pintarla en el <img>.
 * image_path es la ruta dentro del bucket, que es lo que hay que volver a
 * guardar. Son dos cosas distintas y por eso viajan en dos campos: confundirlas
 * fue justo el bug de la imagen rota.
 */
interface Pack {
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
  starts_at: string | null
  ends_at: string | null
  image_url: string | null
  is_active: boolean
  status: string
  image_path?: string | null
  category?: string | null
  tags?: string[] | null
  allergen_notice?: string | null
  handling_notice?: string | null
  image_gallery?: string[] | null
}

interface Props {
  shopId: string
  pack?: Pack
  isDuplicate?: boolean
  onSuccess?: () => void
}

function fileExt(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export default function PackFormSimplified({ shopId, pack, isDuplicate = false, onSuccess }: Props) {
  const router = useRouter()
  const supabaseRef = useRef(supabaseBrowser())
  const supabase = supabaseRef.current
  const isEditing = !!pack && !isDuplicate
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(pack?.category ?? null)
  const [allergenNotice, setAllergenNotice] = useState(pack?.allergen_notice ?? '')
  const [packFile, setPackFile] = useState<File | null>(null)
  const [formData, setFormData] = useState<PackFormData>(() => {
    if (pack && !isDuplicate) {
      return packToFormData({ ...pack })
    }
    return getDefaultPackData(shopId)
  })

  const pickupData = {
    pickup_date: formData.pickup_date,
    pickup_start_time: formData.pickup_start_time,
    pickup_end_time: formData.pickup_end_time,
  }

  const basicData = {
    title: formData.title,
    description: formData.description,
    price_cents: formData.price_cents,
    original_price_cents: formData.original_price_cents,
    total_stock: formData.total_stock,
    image_url: formData.image_url,
  }

  /*
   * Sube la imagen elegida al bucket y devuelve su RUTA (no su URL).
   * El nombre incluye el packId para que cada pack tenga su propia carpeta y
   * dos packs no puedan pisarse el archivo.
   */
  const uploadPackImage = async (packId: string, file: File) => {
    const objectPath = `${shopId}/${packId}/${crypto.randomUUID()}.${fileExt(file)}`
    const { error: upErr } = await supabase.storage.from('pack-images').upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) throw upErr
    return objectPath
  }

  /*
   * Campos que este formulario no muestra pero que las RPC exigen. Se arrastran
   * desde el pack original para que guardar una edicion no los borre por
   * omision: update_pack_content escribe SIEMPRE los 14 parametros, no hace
   * merge parcial, asi que lo que no se reenvie se pierde.
   */
  const buildExtras = (imagePath: string): PackContentExtras => ({
    category: selectedCategory ?? pack?.category ?? 'surprise',
    tags: pack?.tags ?? [],
    allergen_notice: allergenNotice,
    handling_notice: pack?.handling_notice ?? '',
    sales_start_at: pack?.starts_at ?? new Date().toISOString(),
    image_path: imagePath,
    image_gallery: pack?.image_gallery ?? [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const errors = validatePackForm(formData)
    const firstError = Object.values(errors)[0]
    if (firstError) {
      setError(firstError)
      setLoading(false)
      return
    }

    try {
      if (isEditing && pack) {
        await saveExistingPack(pack)
      } else {
        await createNewPack()
      }
    } catch (err: unknown) {
      logger.error('PackFormSimplified savePack', err)
      setError(translateDbError(err, 'No se pudo guardar el pack.'))
      setLoading(false)
    }
  }

  /*
   * EDICION. update_pack_content exige que el pack este en draft o paused; la
   * pantalla ya no monta el formulario en otros estados, pero si la RPC lo
   * rechaza el mensaje se traduce y se muestra tal cual.
   *
   * El stock no se envia: no es un parametro de esta funcion.
   */
  const saveExistingPack = async (current: Pack) => {
    let imagePath = current.image_path ?? ''
    if (packFile) {
      imagePath = await uploadPackImage(current.id, packFile)
    }

    const { error: updErr } = await supabase.rpc('update_pack_content', {
      p_pack_id: current.id,
      ...buildPackContentParams(formData, buildExtras(imagePath)),
    })
    if (updErr) throw updErr

    setSuccess('Cambios guardados.')
    setTimeout(() => {
      router.push('/business/packs')
      router.refresh()
      onSuccess?.()
    }, 1200)
  }

  /*
   * CREACION. create_pack_draft necesita el pack ya creado para poder subir la
   * imagen a su carpeta, asi que primero se crea el borrador (con la imagen del
   * comercio como respaldo) y solo si hay archivo se hace la segunda llamada.
   */
  const createNewPack = async () => {
    const { data: shopPayload } = await supabase.rpc('get_my_shop')
    const shopRow = (shopPayload as { shop?: { cover_path?: string | null; logo_path?: string | null } } | null)?.shop
    const fallbackPath = shopRow?.cover_path || shopRow?.logo_path || ''

    const params = buildPackContentParams(formData, buildExtras(fallbackPath))

    const { data, error: err } = await supabase.rpc('create_pack_draft', {
      p_shop_id: shopId,
      p_total_stock: formData.total_stock,
      ...params,
    })
    if (err) throw err

    const created = data as { pack_id?: string }
    if (!created?.pack_id) throw new Error('No se pudo crear el pack')

    let imagePath = fallbackPath
    if (packFile) {
      imagePath = await uploadPackImage(created.pack_id, packFile)

      const { error: updErr } = await supabase.rpc('update_pack_content', {
        p_pack_id: created.pack_id,
        ...buildPackContentParams(formData, buildExtras(imagePath)),
      })
      if (updErr) throw updErr
    }

    setSuccess(
      imagePath
        ? 'Pack guardado como borrador con imagen.'
        : 'Pack guardado como borrador. Falta imagen para publicar.',
    )
    setTimeout(() => {
      router.push('/business/packs')
      router.refresh()
      onSuccess?.()
    }, 1500)
  }

  const handleCategorySelect = (
    id: string | null,
    template?: { title: string; description: string; price_cents: number; original_price_cents: number },
  ) => {
    setSelectedCategory(id)
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: template.title,
        description: template.description,
        price_cents: template.price_cents,
        original_price_cents: template.original_price_cents,
      }))
    }
  }

  return (
    <div className="space-y-6">
      <PackCategoryTemplates
        selectedCategory={selectedCategory}
        onSelect={(id, template) => handleCategorySelect(id, template)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PackFormBasicInfo
          data={basicData}
          onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
          shopId={shopId}
          onError={setError}
          onFileChosen={(file) => setPackFile(file)}
          stockReadOnly={isEditing}
        />

        <div className="dark:bg-black/40 bg-white rounded-2xl p-6 border dark:border-white/10 border-gray-200">
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-2">
            Aviso de alérgenos (recomendado para poder publicar)
          </label>
          <textarea
            value={allergenNotice}
            onChange={(e) => setAllergenNotice(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 dark:text-white text-gray-900"
            placeholder="Ej: Puede contener gluten, lácteos y trazas de frutos secos."
          />
        </div>

        <PackFormPickupTime data={pickupData} onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))} />

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-200">Error</h3>
              <p className="text-sm text-red-100/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-green-200">Exito</h3>
              <p className="text-sm text-green-100/70 mt-1">{success}</p>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1" disabled={loading} loading={loading}>
            <Package className="w-4 h-4 mr-2" />
            {loading
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : isDuplicate
                  ? 'Duplicar Pack'
                  : 'Crear borrador'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
        </div>
      </form>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
