'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import Toast from '@/components/ui/Toast'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import BusinessProfileLayout from '@/components/business/profile/BusinessProfileLayout'
import ProfileInfoForm from '@/components/business/profile/ProfileInfoForm'
import ProfileImagesForm from '@/components/business/profile/ProfileImagesForm'
import ProfileLocationForm from '@/components/business/profile/ProfileLocationForm'
import ProfileHoursForm from '@/components/business/profile/ProfileHoursForm'
import ProfileSettingsForm from '@/components/business/profile/ProfileSettingsForm'
import ProfilePreview from '@/components/business/ProfilePreview'
import UnsavedChangesBar from '@/components/business/UnsavedChangesBar'
import { DAY_LABELS } from '@/lib/constants/hours'
import { translateDbError } from '@/lib/utils/db-errors'
import { parseShopStatus, canSubmitForReview, getMissingRequiredFields, type ShopStatus } from '@/lib/utils/shopReview'
import {
  buildShopHourPayloads,
  createDefaultHours,
  hoursRowsToFormState,
  validateHours,
  type HoursData,
  type ShopHourRow,
} from '@/lib/utils/shopHours'
import { parseCoordinate, validateCoordinatePair } from '@/lib/utils/coordinates'
import { getChileRutError, normalizeChileRut } from '@/lib/utils/chileRut'
import { useMerchantTerms } from '@/hooks/useMerchantTerms'

const CHILE_MARKET_ID = '10000000-0000-4000-8000-000000000001'
const SANTIAGO_LOCALITY_ID = '10000000-0000-4000-8000-000000000101'

interface ShopData {
  id: string
  name: string
  description: string | null
  category: string | null
  address: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  instagram: string | null
  /** RUT de la empresa, normalizado NNNNNNNN-D (0038). */
  tax_id: string | null
  /** Nº de resolución sanitaria SEREMI de Salud (0038). */
  sanitary_resolution: string | null
  logo_url: string | null
  cover_url: string | null
  logo_path: string | null
  cover_path: string | null
  default_pack_image_path: string | null
  hours: string | null
  /** Estado canonico de la tabla `shops`. Antes solo se guardaba el booleano
   *  `verified`, que aplastaba los seis estados en dos y hacia que un comercio
   *  en `draft` leyera "sera revisado en 24-48 horas" sin haberlo enviado. */
  status: ShopStatus
  status_reason: string | null
  owner_id: string
}

/** Un día de horario que no se pudo guardar. */
interface HourFailure {
  day: string
  message: string
}

function storagePath(value: string, fallback: string | null) {
  if (value && !value.startsWith('http') && !value.startsWith('blob:')) return value
  return fallback ?? ''
}

/**
 * Guarda los 7 días de horario.
 *
 * Correcciones respecto a la versión anterior:
 *  1. `p_weekday` usa la convención canónica 0..6 (domingo = 0). Antes enviaba
 *     `i + 1`, es decir 1..7, y el domingo (7) violaba el CHECK
 *     `weekday >= 0 AND weekday <= 6`.
 *  2. Un día cerrado envía NULL en las horas. Antes enviaba '00:00', que viola
 *     el CHECK `is_closed = true AND opens_at IS NULL AND closes_at IS NULL`.
 *  3. No lanza al primer fallo: recoge los errores por día y los devuelve, para
 *     no dejar la semana guardada a medias en silencio.
 */
async function persistHours(
  client: ReturnType<typeof supabaseBrowser>,
  shopId: string,
  hoursMap: HoursData,
): Promise<HourFailure[]> {
  const payloads = buildShopHourPayloads(shopId, hoursMap)

  const results = await Promise.all(
    payloads.map(async (payload, displayIndex) => {
      const { error } = await client.rpc('set_shop_hour', payload)
      if (!error) return null
      return { day: DAY_LABELS[displayIndex], message: translateDbError(error) } as HourFailure
    }),
  )

  return results.filter((r): r is HourFailure => r !== null)
}

export default function BusinessProfilePage() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<ShopData | null>(null)
  const [activeTab, setActiveTab] = useState('info')
  const [previewMode, setPreviewMode] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  // Términos para Comercios (0040): si hay documento publicado y este dueño
  // aún no lo aceptó, el envío a revisión exige marcar el checkbox. La
  // aceptación real se registra en la base justo antes de enviar.
  const merchantTerms = useMerchantTerms()
  const [termsChecked, setTermsChecked] = useState(false)
  const termsRequired = !merchantTerms.loading && merchantTerms.documentId !== null && !merchantTerms.accepted

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    city: 'Santiago',
    country: 'CL',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    instagram: '',
    taxId: '',
    sanitaryResolution: '',
    logoUrl: '',
    coverUrl: '',
    packImageUrl: '',
    verified: false,
  })

  const [hours, setHours] = useState<HoursData>(createDefaultHours)

  useEffect(() => {
    if (!user?.id) return

    const loadShop = async () => {
      const { data, error } = await supabase.rpc('get_my_shop')
      if (error) {
        setToast({ message: translateDbError(error, 'No se pudo cargar el comercio.'), type: 'error' })
        setLoading(false)
        return
      }

      const payload = data as {
        shop?: Record<string, unknown> | null
        hours?: ShopHourRow[] | null
      } | null

      const row = payload?.shop
      if (row && typeof row.id === 'string') {
        const mapped: ShopData = {
          id: row.id,
          name: String(row.name ?? ''),
          description: (row.description as string | null) ?? null,
          category: (row.category as string | null) ?? null,
          address: (row.address_line1 as string | null) ?? null,
          city: 'Santiago',
          country: 'CL',
          latitude: (row.latitude as number | null) ?? null,
          longitude: (row.longitude as number | null) ?? null,
          phone: (row.phone_e164 as string | null) ?? null,
          website: (row.website_url as string | null) ?? null,
          instagram: (row.instagram_handle as string | null) ?? null,
          tax_id: (row.tax_id as string | null) ?? null,
          sanitary_resolution: (row.sanitary_resolution as string | null) ?? null,
          logo_url: null,
          cover_url: null,
          logo_path: (row.logo_path as string | null) ?? null,
          cover_path: (row.cover_path as string | null) ?? null,
          default_pack_image_path: (row.default_pack_image_path as string | null) ?? null,
          hours: null,
          status: parseShopStatus(row.status),
          status_reason: (row.status_reason as string | null) ?? null,
          owner_id: user.id,
        }
        setShop(mapped)
        setFormData({
          name: mapped.name,
          description: mapped.description ?? '',
          category: mapped.category ?? '',
          address: mapped.address ?? '',
          city: 'Santiago',
          country: 'CL',
          latitude: mapped.latitude ? String(mapped.latitude) : '',
          longitude: mapped.longitude ? String(mapped.longitude) : '',
          phone: mapped.phone ?? '',
          website: mapped.website ?? '',
          instagram: mapped.instagram ?? '',
          taxId: mapped.tax_id ?? '',
          sanitaryResolution: mapped.sanitary_resolution ?? '',
          logoUrl: mapped.logo_path ?? '',
          coverUrl: mapped.cover_path ?? '',
          packImageUrl: mapped.default_pack_image_path ?? '',
          verified: mapped.status === 'verified',
        })
      }

      const hoursRows = payload?.hours
      if (hoursRows?.length) {
        setHours(hoursRowsToFormState(hoursRows))
      }
      setLoading(false)
    }

    void loadShop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const updateForm = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  /**
   * Los horarios también son cambios sin guardar. Antes `setHours` se pasaba
   * directo al formulario y nunca marcaba `isDirty`, así que la barra de
   * "Guardar cambios" no llegaba a aparecer al editar solo horarios.
   */
  const updateHours = (next: HoursData) => {
    setHours(next)
    setIsDirty(true)
  }

  /**
   * Guarda el perfil. Devuelve `true` solo si todo se guardo correctamente,
   * para que "Guardar y enviar" pueda encadenar el envio a revision sin
   * mandar a revisar una version que no llego a persistirse.
   */
  const handleSave = async (toastMessage?: string): Promise<boolean> => {
    setSaving(true)
    setIsSaving(true)

    try {
      if (!formData.name.trim()) {
        setToast({ message: 'El nombre del comercio es obligatorio.', type: 'error' })
        return false
      }

      // Validar los horarios ANTES de tocar la base de datos: si un día es
      // inválido, no tiene sentido haber guardado ya el resto del perfil.
      const hourErrors = validateHours(hours)
      if (hourErrors.length > 0) {
        setToast({ message: `Revisa los horarios. ${hourErrors[0]}`, type: 'error' })
        setActiveTab('hours')
        return false
      }

      // Validar coordenadas ANTES de tocar la base: espejo de los CHECK de
      // 0003 (par obligatorio y rangos). Sin esto, una latitud mal tipeada
      // (999, sin el signo, o a medias) cae en el RPC con un error feo de
      // Postgres en vez de un mensaje claro (F2b).
      const coordCheck = validateCoordinatePair(formData.latitude, formData.longitude)
      if (!coordCheck.ok) {
        setToast({ message: coordCheck.error ?? 'Coordenadas inválidas.', type: 'error' })
        setActiveTab('location')
        return false
      }

      // Validar el RUT ANTES de tocar la base: espejo de
      // app_private.normalize_chile_rut (0038). Vacío se permite guardar
      // (el aviso de campos faltantes ya lo reclama para enviar a revisión);
      // mal escrito, no.
      const rutError = getChileRutError(formData.taxId)
      if (rutError) {
        setToast({ message: rutError, type: 'error' })
        setActiveTab('info')
        return false
      }

      if (shop?.id) {
        const logoPath = storagePath(formData.logoUrl, shop.logo_path)
        const coverPath = storagePath(formData.coverUrl, shop.cover_path)
        const packImagePath = storagePath(formData.packImageUrl, shop.default_pack_image_path)
        const { error } = await supabase.rpc('update_own_shop', {
          p_shop_id: shop.id,
          p_locality_id: SANTIAGO_LOCALITY_ID,
          p_name: formData.name,
          p_description: formData.description,
          p_category: formData.category,
          p_phone_e164: formData.phone,
          p_website_url: formData.website,
          p_instagram_handle: formData.instagram,
          p_address_line1: formData.address,
          p_address_line2: '',
          p_postal_code: '',
          p_latitude: parseCoordinate(formData.latitude),
          p_longitude: parseCoordinate(formData.longitude),
          p_logo_path: logoPath,
          p_cover_path: coverPath,
          // Cadena vacia = borrar. La RPC distingue '' de null a proposito.
          p_default_pack_image_path: packImagePath,
          // Normalizado aqui para que el comercio vea el formato canonico
          // (12345678-K) al recargar, escriba como escriba.
          p_tax_id: formData.taxId.trim() === '' ? '' : (normalizeChileRut(formData.taxId) ?? ''),
          p_sanitary_resolution: formData.sanitaryResolution,
        })
        if (error) throw error

        const failures = await persistHours(supabase, shop.id, hours)

        setShop({
          ...shop,
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          address: formData.address || null,
          phone: formData.phone || null,
          website: formData.website || null,
          instagram: formData.instagram || null,
          tax_id: normalizeChileRut(formData.taxId),
          sanitary_resolution: formData.sanitaryResolution.trim() || null,
          latitude: parseCoordinate(formData.latitude),
          longitude: parseCoordinate(formData.longitude),
          logo_path: logoPath || null,
          cover_path: coverPath || null,
          default_pack_image_path: packImagePath || null,
        })

        if (failures.length > 0) {
          const detalle = failures.map((f) => f.day).join(', ')
          setToast({
            message: `Se guardó el perfil, pero fallaron los horarios de: ${detalle}. ${failures[0].message}`,
            type: 'error',
          })
          setIsDirty(false)
          return false
        }

        const msg = typeof toastMessage === 'string' ? toastMessage : 'Perfil y horarios actualizados'
        setToast({ message: msg, type: 'success' })
        setIsDirty(false)
        return true
      }

      const { data, error } = await supabase.rpc('create_own_shop', {
        p_market_id: CHILE_MARKET_ID,
        p_locality_id: SANTIAGO_LOCALITY_ID,
        p_name: formData.name,
        p_description: formData.description,
        p_category: formData.category,
        p_phone_e164: formData.phone,
        p_address_line1: formData.address,
        p_address_line2: '',
        p_postal_code: '',
        // La RPC ya aceptaba coordenadas (0009:1285) pero la página nunca
        // las mandaba: al crear, lo tipeado se tiraba en silencio.
        p_latitude: parseCoordinate(formData.latitude),
        p_longitude: parseCoordinate(formData.longitude),
      })
      if (error) throw error

      const created = data as { shop_id?: string; success?: boolean }
      if (!created?.shop_id) throw new Error('No se pudo crear el comercio')

      const failures = await persistHours(supabase, created.shop_id, hours)

      setShop({
        id: created.shop_id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        address: formData.address || null,
        city: 'Santiago',
        country: 'CL',
        latitude: parseCoordinate(formData.latitude),
        longitude: parseCoordinate(formData.longitude),
        phone: formData.phone || null,
        website: formData.website || null,
        instagram: formData.instagram || null,
        // create_own_shop no acepta estos campos: se guardan en el siguiente
        // "Guardar cambios" vía update_own_shop (0038).
        tax_id: null,
        sanitary_resolution: null,
        logo_url: null,
        cover_url: null,
        logo_path: null,
        cover_path: null,
        default_pack_image_path: null,
        hours: null,
        status: 'draft',
        status_reason: null,
        owner_id: user!.id,
      })

      if (failures.length > 0) {
        const detalle = failures.map((f) => f.day).join(', ')
        setToast({
          message: `Se creó el comercio, pero fallaron los horarios de: ${detalle}. ${failures[0].message}`,
          type: 'error',
        })
        setIsDirty(false)
        return false
      }

      const msg = typeof toastMessage === 'string' ? toastMessage : 'Comercio creado en borrador'
      setToast({ message: msg, type: 'success' })
      setIsDirty(false)
      return true
    } catch (err: unknown) {
      setToast({ message: translateDbError(err, 'No se pudieron guardar los cambios.'), type: 'error' })
      return false
    } finally {
      setSaving(false)
      setIsSaving(false)
    }
  }

  /**
   * Envia el comercio a revision (RPC `submit_own_shop_for_review`).
   *
   * La RPC exige estado draft|rejected y 8 campos NOT NULL. Aqui se comprueban
   * ambas cosas ANTES de llamar, para que el comercio no reciba un
   * `SHOP_PROFILE_INCOMPLETE` generico sin saber que le falta. Las guardas de
   * abajo son una red de seguridad: la UI ya desactiva el boton en esos casos.
   */
  const handleSubmitForReview = async () => {
    if (!shop?.id) return
    if (!canSubmitForReview(shop.status)) return

    // Faltan datos obligatorios: no se llama a la RPC para que el comercio no
    // reciba un SHOP_PROFILE_INCOMPLETE generico. Se le lleva a la pestana.
    const missing = getMissingRequiredFields(formData)
    if (missing.length > 0) {
      setToast({ message: `Faltan datos obligatorios: ${missing.map((f) => f.label).join(', ')}.`, type: 'error' })
      setActiveTab(missing[0].tab)
      return
    }

    // La RPC exigirá la aceptación de los términos (0040): si hace falta y el
    // checkbox no está marcado, se avisa aquí en lugar de dejar que la base
    // responda con un MERCHANT_TERMS_NOT_ACCEPTED tras el clic.
    if (termsRequired && !termsChecked) {
      setToast({ message: 'Debes aceptar los Términos y Condiciones para Comercios antes de enviar.', type: 'error' })
      return
    }

    setSubmittingReview(true)
    try {
      // Hay cambios sin guardar: se guardan primero. Obligar al comercio a
      // guardar, bajar a buscar el boton y volver arriba a enviar son tres
      // pasos para un solo gesto. Si el guardado falla, NO se envia: se
      // revisaria una version distinta de la que el comercio ve en pantalla.
      if (isDirty) {
        const saved = await handleSave('Cambios guardados. Enviando a revision...')
        if (!saved) return
      }

      // La aceptación se registra ANTES del envío: la RPC de envío la valida.
      // accept_legal_document es idempotente (ON CONFLICT DO NOTHING), así que
      // reintentar tras un fallo posterior no duplica nada.
      if (termsRequired) {
        await merchantTerms.accept()
      }

      const { error } = await supabase.rpc('submit_own_shop_for_review', { p_shop_id: shop.id })
      if (error) throw error

      // La RPC deja el comercio en `pending_review` y limpia el motivo del
      // rechazo anterior. Se refleja igual en pantalla para no recargar.
      setShop({ ...shop, status: 'pending_review', status_reason: null })
      setToast({ message: 'Comercio enviado a revision. Te avisaremos en 24-48 horas.', type: 'success' })
    } catch (err: unknown) {
      setToast({ message: translateDbError(err, 'No se pudo enviar a revision.'), type: 'error' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDiscard = () => {
    if (shop) {
      setFormData({
        name: shop.name ?? '',
        description: shop.description ?? '',
        category: shop.category ?? '',
        address: shop.address ?? '',
        city: shop.city ?? 'Santiago',
        country: shop.country ?? 'CL',
        latitude: shop.latitude ? shop.latitude.toString() : '',
        longitude: shop.longitude ? shop.longitude.toString() : '',
        phone: shop.phone ?? '',
        website: shop.website ?? '',
        instagram: shop.instagram ?? '',
        taxId: shop.tax_id ?? '',
        sanitaryResolution: shop.sanitary_resolution ?? '',
        logoUrl: shop.logo_path ?? '',
        coverUrl: shop.cover_path ?? '',
        packImageUrl: shop.default_pack_image_path ?? '',
        verified: shop.status === 'verified',
      })
    }
    setIsDirty(false)
    setToast({ message: 'Cambios descartados', type: 'success' })
  }

  const handleDelete = async () => {
    setToast({ message: 'Eliminar comercio no está disponible en esta versión.', type: 'error' })
  }

  if (loading) return <LoadingSkeleton />

  if (previewMode) {
    return <ProfilePreview formData={formData} hours={hours} onBack={() => setPreviewMode(false)} />
  }

  const completionFields = ['name', 'description', 'category', 'address', 'city', 'phone', 'logoUrl', 'coverUrl']
  const filled = completionFields.filter((f) => formData[f as keyof typeof formData]).length
  const completionPercentage = Math.round((filled / completionFields.length) * 100)

  // OJO: `completionPercentage` mide OTROS campos (incluye description y
  // coverUrl, que la RPC no exige; omite latitud/longitud, que si exige). No
  // sirve para decidir si se puede enviar a revision: se calcula aparte.
  const missingRequired = getMissingRequiredFields(formData)

  return (
    <div className="space-y-6">
      <BusinessProfileLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shopName={formData.name}
        completionPercentage={completionPercentage}
        onPreview={() => setPreviewMode(true)}
        status={shop?.status ?? 'draft'}
        statusReason={shop?.status_reason ?? null}
        missingFields={missingRequired}
        hasUnsavedChanges={isDirty}
        onSubmitForReview={handleSubmitForReview}
        onGoToTab={setActiveTab}
        submitting={submittingReview}
        shopExists={Boolean(shop?.id)}
        termsRequired={termsRequired}
        termsChecked={termsChecked}
        onTermsCheckedChange={setTermsChecked}
      >
        <UnsavedChangesBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} saving={saving} />
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary animate-spin rounded-full" />
            Guardando...
          </div>
        )}

        {activeTab === 'info' && <ProfileInfoForm formData={formData} updateForm={updateForm} />}

        {activeTab === 'images' && (
          <ProfileImagesForm
            logoUrl={formData.logoUrl}
            coverUrl={formData.coverUrl}
            onLogoChange={(url) => updateForm('logoUrl', url)}
            onCoverChange={(url) => updateForm('coverUrl', url)}
            packImageUrl={formData.packImageUrl}
            onPackImageChange={(url) => updateForm('packImageUrl', url)}
            onImageError={(message) => setToast({ message, type: 'error' })}
            shopId={shop?.id ?? ''}
          />
        )}

        {activeTab === 'location' && (
          <ProfileLocationForm
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLatitudeChange={(value) => updateForm('latitude', value)}
            onLongitudeChange={(value) => updateForm('longitude', value)}
          />
        )}

        {activeTab === 'hours' && <ProfileHoursForm hours={hours} onHoursChange={updateHours} />}

        {activeTab === 'settings' && <ProfileSettingsForm onDelete={handleDelete} />}
      </BusinessProfileLayout>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
