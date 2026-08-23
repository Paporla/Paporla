'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertCircle, CheckCircle, Rocket } from 'lucide-react'
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
  getPublishBlockers,
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
  /*
   * shops.status. Solo un comercio 'verified' puede publicar. Llega desde la
   * pantalla, que ya consulta get_my_shop, para no repetir la llamada aqui.
   * Si no se pasa, no se bloquea por este motivo y decide la RPC.
   */
  shopStatus?: string | null
}

function fileExt(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export default function PackFormSimplified({ shopId, pack, isDuplicate = false, onSuccess, shopStatus }: Props) {
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
  /*
   * Que boton se pulso, por duplicado y a proposito:
   *
   *   - La REF es la que manda al guardar. handleSubmit la lee en el mismo tick
   *     del submit, cuando un setState todavia no se habria aplicado.
   *   - El ESTADO existe solo para pintar el spinner en el boton correcto. Leer
   *     la ref durante el render no dispara re-render (y el linter lo prohibe
   *     con razon: react-hooks/refs), asi que el spinner se quedaria pegado.
   *
   * Los dos se escriben juntos en onClick.
   */
  const publishIntentRef = useRef(false)
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | null>(null)
  const [formData, setFormData] = useState<PackFormData>(() => {
    if (!pack) {
      return getDefaultPackData(shopId)
    }

    const base = packToFormData({ ...pack })

    if (!isDuplicate) {
      return base
    }

    /*
     * DUPLICAR tambien parte de los datos del original: es el sentido de la
     * pantalla. Antes se ignoraba el pack y se cargaban los valores por
     * defecto, asi que titulo, descripcion, precios y stock salian vacios,
     * mientras que categoria y alergenos si se copiaban porque viven en
     * estados aparte. De ahi que la copia saliera a medias.
     *
     * Dos excepciones, que no son datos del pack sino de ESTA venta concreta:
     *
     *   - La fecha de recogida vuelve al valor por defecto (manana). La del
     *     original suele estar ya pasada y la copia naceria caducada, que es
     *     justo el fallo que se corrigio al hacer la recogida obligatoria.
     *   - La imagen no se hereda: image_path apunta a la carpeta del pack
     *     original, asi que la copia dependeria de un archivo ajeno. Se sube
     *     de nuevo, y mientras tanto se usa la del comercio como respaldo.
     */
    const defaults = getDefaultPackData(shopId)

    return {
      ...base,
      pickup_date: defaults.pickup_date,
      image_url: '',
    }
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
   * Motivos por los que no se puede publicar todavia. Se recalculan en cada
   * render para que el aviso siga al formulario mientras se rellena.
   *
   * hasImage: vale cualquiera de las tres vias por las que el pack acabara
   * teniendo imagen — un archivo recien elegido, la que ya tenia, o la del
   * comercio que createNewPack usa como respaldo.
   */
  const publishBlockers = getPublishBlockers(formData, {
    allergenNotice,
    hasImage: !!packFile || !!formData.image_url || !!pack?.image_path,
    shopStatus,
    packStatus: isEditing ? pack?.status : 'draft',
  })
  const canPublish = publishBlockers.length === 0

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
    /*
     * Al duplicar se empieza a vender ahora, no cuando empezo el original: su
     * sales_start_at es una fecha pasada que no describe al pack nuevo.
     */
    sales_start_at: isEditing ? (pack?.starts_at ?? new Date().toISOString()) : new Date().toISOString(),
    image_path: imagePath,
    /*
     * La galeria tampoco se hereda: sus rutas apuntan a la carpeta del pack
     * original, asi que la copia quedaria dependiendo de archivos ajenos.
     */
    image_gallery: isEditing ? (pack?.image_gallery ?? []) : [],
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
    } finally {
      publishIntentRef.current = false
      setPendingAction(null)
    }
  }

  /*
   * Publica un pack recien guardado.
   *
   * Va DESPUES de guardar y en llamada aparte porque publish_pack es una RPC
   * independiente: lee de la tabla, asi que el contenido debe estar escrito
   * antes. Si el guardado fue bien pero la publicacion falla, el pack queda
   * como borrador con los cambios a salvo y se avisa del motivo; perder lo
   * escrito seria mucho peor que quedarse sin publicar.
   */
  const publishSavedPack = async (packId: string): Promise<boolean> => {
    const { error: pubErr } = await supabase.rpc('publish_pack', { p_pack_id: packId })
    if (pubErr) {
      logger.error('PackFormSimplified publishPack', pubErr)
      setError(
        translateDbError(pubErr, 'El pack se guardó, pero no se pudo publicar. Revísalo y publícalo desde la lista.'),
      )
      return false
    }
    return true
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

    if (publishIntentRef.current) {
      const published = await publishSavedPack(current.id)
      if (!published) {
        setLoading(false)
        return
      }
      setSuccess('Cambios guardados y pack publicado.')
    } else {
      setSuccess('Cambios guardados.')
    }

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

    if (publishIntentRef.current) {
      const published = await publishSavedPack(created.pack_id)
      if (!published) {
        setLoading(false)
        return
      }
      setSuccess('Pack publicado. Ya se puede reservar.')
    } else {
      setSuccess(
        imagePath
          ? 'Pack guardado como borrador con imagen.'
          : 'Pack guardado como borrador. Falta imagen para publicar.',
      )
    }

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

        {/*
         * Que falta para publicar. Se muestra solo cuando hay algo que decir,
         * para que el comercio sepa por que el boton verde no esta disponible
         * en vez de pulsarlo y recibir un PACK_NOT_PUBLISHABLE sin detalle.
         */}
        {!canPublish && publishBlockers.length > 0 && (
          <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-4">
            <p className="text-sm font-medium dark:text-gray-300 text-gray-700">Para publicar te falta:</p>
            <ul className="mt-2 space-y-1">
              {publishBlockers.map((blocker) => (
                <li key={blocker} className="flex items-start gap-2 text-sm dark:text-gray-400 text-gray-600">
                  <span className="text-primary mt-0.5">•</span>
                  {blocker}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs dark:text-gray-500 text-gray-500">
              Puedes guardarlo como borrador y publicarlo más tarde.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {/*
           * Publicar es la accion principal: es lo que el comercio quiere de
           * verdad. Guardar borrador queda como salida secundaria, no como el
           * unico camino que obligaba a salir y volver a entrar para publicar.
           */}
          <Button
            type="submit"
            className="flex-1 order-1 sm:order-2"
            disabled={loading || !canPublish}
            loading={loading && pendingAction === 'publish'}
            onClick={() => {
              publishIntentRef.current = true
              setPendingAction('publish')
            }}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Guardar y publicar
          </Button>

          <Button
            type="submit"
            variant="outline"
            className="flex-1 order-2 sm:order-1"
            disabled={loading}
            loading={loading && pendingAction === 'save'}
            onClick={() => {
              publishIntentRef.current = false
              setPendingAction('save')
            }}
          >
            <Package className="w-4 h-4 mr-2" />
            {isEditing ? 'Guardar cambios' : isDuplicate ? 'Guardar copia' : 'Guardar borrador'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="sm:w-32 order-3"
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </form>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
