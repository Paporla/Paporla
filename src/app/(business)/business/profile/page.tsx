'use client'

import { useState, useEffect, useRef } from 'react'
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

interface HoursData {
  [key: string]: { open: string; close: string; closed: boolean }
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

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
  hours: string | null
  verified: boolean
  owner_id: string
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
  const autoSaveRef = useRef<NodeJS.Timeout>()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    city: '',
    country: 'VE',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    instagram: '',
    logoUrl: '',
    coverUrl: '',
    verified: false,
  })

  const [hours, setHours] = useState<HoursData>(() => {
    const initial: HoursData = {}
    DAYS.forEach((day) => {
      initial[day] = { open: '09:00', close: '18:00', closed: day === 'Domingo' }
    })
    return initial
  })

  useEffect(() => {
    if (user?.id) loadShop()
  }, [user])

  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [])

  const loadShop = async () => {
    const { data } = await supabase.from('shops').select('*').eq('owner_id', user?.id).maybeSingle()
    if (data) {
      setShop(data)
      setFormData({
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || 'VE',
        latitude: data.latitude ? data.latitude.toString() : '',
        longitude: data.longitude ? data.longitude.toString() : '',
        phone: data.phone || '',
        website: data.website || '',
        instagram: data.instagram || '',
        logoUrl: data.logo_url || '',
        coverUrl: data.cover_url || '',
        verified: data.verified || false,
      })
      if (data.hours) {
        try {
          setHours((prev) => ({ ...prev, ...JSON.parse(data.hours || '{}') }))
        } catch {}
      }
    }
    setLoading(false)
  }

  const updateForm = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => handleSave('Cambios guardados'), 3000)
  }

  const handleSave = async (toastMessage?: string) => {
    if (!shop?.id) {
      setToast({ message: 'No se encontró el comercio', type: 'error' })
      return
    }

    setSaving(true)
    setIsSaving(true)

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        phone: formData.phone || null,
        website: formData.website || null,
        instagram: formData.instagram || null,
        logo_url: formData.logoUrl || null,
        cover_url: formData.coverUrl || null,
        hours: JSON.stringify(hours),
      }

      const { error } = await supabase.from('shops').update(updateData).eq('id', shop.id)

      if (error) throw error

      setToast({ message: toastMessage || 'Perfil actualizado correctamente', type: 'success' })
      setIsDirty(false)
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Error al guardar los cambios', type: 'error' })
    } finally {
      setSaving(false)
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        category: shop.category || '',
        address: shop.address || '',
        city: shop.city || '',
        country: shop.country || 'VE',
        latitude: shop.latitude ? shop.latitude.toString() : '',
        longitude: shop.longitude ? shop.longitude.toString() : '',
        phone: shop.phone || '',
        website: shop.website || '',
        instagram: shop.instagram || '',
        logoUrl: shop.logo_url || '',
        coverUrl: shop.cover_url || '',
        verified: shop.verified || false,
      })
      if (shop.hours) {
        try {
          setHours((prev) => ({ ...prev, ...JSON.parse(shop.hours || '{}') }))
        } catch {}
      }
    }
    setIsDirty(false)
    setToast({ message: 'Cambios descartados', type: 'success' })
  }

  const handleDelete = async () => {
    if (!shop?.id) return
    const { error } = await supabase.from('shops').delete().eq('id', shop.id)
    if (error) {
      setToast({ message: error.message, type: 'error' })
    } else {
      window.location.href = '/business'
    }
  }

  if (loading) return <LoadingSkeleton />

  if (previewMode) {
    return <ProfilePreview formData={formData} hours={hours} onBack={() => setPreviewMode(false)} />
  }

  const completionPercentage = Object.values(formData).filter((v) => v).length * 10

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
            shopId={shop!.id}
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

        {activeTab === 'hours' && <ProfileHoursForm hours={hours} onHoursChange={setHours} />}

        {activeTab === 'settings' && <ProfileSettingsForm onDelete={handleDelete} />}
      </BusinessProfileLayout>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
