'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { supabaseBrowser } from '@/lib/supabase/client'
import PackCategoryTemplates from './packs/PackCategoryTemplates'
import PackFormBasicInfo from './packs/PackFormBasicInfo'
import PackFormPickupTime from './packs/PackFormPickupTime'
import {
  PackFormData,
  validatePackForm,
  getDefaultPackData,
  packToFormData,
  buildPackInsertData,
} from '@/lib/utils/packForm'

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
}

interface Props {
  shopId: string
  pack?: Pack
  isDuplicate?: boolean
  onSuccess?: () => void
}

export default function PackFormSimplified({ shopId, pack, isDuplicate = false, onSuccess }: Props) {
  const router = useRouter()
  const supabaseRef = useRef(supabaseBrowser())
  const supabase = supabaseRef.current
  const isEditing = !!pack && !isDuplicate
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
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

    const packData = buildPackInsertData(shopId, formData, !isEditing)

    try {
      if (isEditing && pack) {
        const { error: err } = await supabase.from('packs').update(packData).eq('id', pack.id).eq('shop_id', shopId)

        if (err) throw err
        setSuccess('Pack actualizado correctamente')
      } else {
        const { error: err } = await supabase.from('packs').insert(packData)
        if (err) throw err
        setSuccess(isDuplicate ? 'Pack duplicado correctamente' : 'Pack creado correctamente')
      }

      setTimeout(() => {
        router.push('/business/packs')
        onSuccess?.()
      }, 1500)
    } catch (err: unknown) {
      console.error('Error al guardar pack:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar el pack')
      setLoading(false)
    }
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
        />

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
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Pack' : isDuplicate ? 'Duplicar Pack' : 'Crear Pack'}
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
