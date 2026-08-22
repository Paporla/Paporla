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
import {
  buildShopHourPayloads,
  createDefaultHours,
  hoursRowsToFormState,
  validateHours,
  type HoursData,
  type ShopHourRow,
} from '@/lib/utils/shopHours'

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
  logo_url: string | null
  cover_url: string | null
  logo_path: string | null
  cover_path: string | null
  hours: string | null
  verified: boolean
  owner_id: string
}

/** Un día de horario que no se pudo guardar. */
interface HourFailure {
  day: string
  message: string
}

function parseCoord(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
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
    logoUrl: '',
    coverUrl: '',
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
          logo_url: null,
          cover_url: null,
          logo_path: (row.logo_path as string | null) ?? null,
          cover_path: (row.cover_path as string | null) ?? null,
          hours: null,
          verified: row.status === 'verified',
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
          logoUrl: mapped.logo_path ?? '',
          coverUrl: mapped.cover_path ?? '',
          verified: mapped.verified,
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

  const handleSave = async (toastMessage?: string) => {
    setSaving(true)
    setIsSaving(true)

    try {
      if (!formData.name.trim()) {
        setToast({ message: 'El nombre del comercio es obligatorio.', type: 'error' })
        return
      }

      // Validar los horarios ANTES de tocar la base de datos: si un día es
      // inválido, no tiene sentido haber guardado ya el resto del perfil.
      const hourErrors = validateHours(hours)
      if (hourErrors.length > 0) {
        setToast({ message: `Revisa los horarios. ${hourErrors[0]}`, type: 'error' })
        setActiveTab('hours')
        return
      }

      if (shop?.id) {
        const logoPath = storagePath(formData.logoUrl, shop.logo_path)
        const coverPath = storagePath(formData.coverUrl, shop.cover_path)
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
          p_latitude: parseCoord(formData.latitude),
          p_longitude: parseCoord(formData.longitude),
          p_logo_path: logoPath,
          p_cover_path: coverPath,
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
          latitude: parseCoord(formData.latitude),
          longitude: parseCoord(formData.longitude),
          logo_path: logoPath || null,
          cover_path: coverPath || null,
        })

        if (failures.length > 0) {
          const detalle = failures.map((f) => f.day).join(', ')
          setToast({
            message: `Se guardó el perfil, pero fallaron los horarios de: ${detalle}. ${failures[0].message}`,
            type: 'error',
          })
          setIsDirty(false)
          return
        }

        const msg = typeof toastMessage === 'string' ? toastMessage : 'Perfil y horarios actualizados'
        setToast({ message: msg, type: 'success' })
        setIsDirty(false)
        return
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
        latitude: null,
        longitude: null,
        phone: formData.phone || null,
        website: formData.website || null,
        instagram: formData.instagram || null,
        logo_url: null,
        cover_url: null,
        logo_path: null,
        cover_path: null,
        hours: null,
        verified: false,
        owner_id: user!.id,
      })

      if (failures.length > 0) {
        const detalle = failures.map((f) => f.day).join(', ')
        setToast({
          message: `Se creó el comercio, pero fallaron los horarios de: ${detalle}. ${failures[0].message}`,
          type: 'error',
        })
        setIsDirty(false)
        return
      }

      const msg = typeof toastMessage === 'string' ? toastMessage : 'Comercio creado en borrador'
      setToast({ message: msg, type: 'success' })
      setIsDirty(false)
    } catch (err: unknown) {
      setToast({ message: translateDbError(err, 'No se pudieron guardar los cambios.'), type: 'error' })
    } finally {
      setSaving(false)
      setIsSaving(false)
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
        logoUrl: shop.logo_path ?? '',
        coverUrl: shop.cover_path ?? '',
        verified: shop.verified ?? false,
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

  return (
    <div className="space-y-6">
      <BusinessProfileLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shopName={formData.name}
        verified={formData.verified}
        completionPercentage={completionPercentage}
        onPreview={() => setPreviewMode(true)}
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
