'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { supabaseBrowser } from '@/lib/supabase/client'
import PackCategoryTemplates from './packs/PackCategoryTemplates'
import PackFormBasicInfo from './packs/PackFormBasicInfo'
import PackFormPickupTime from './packs/PackFormPickupTime'

interface Pack {
  id: string; title: string; description: string | null; price_cents: number
  original_price_cents: number | null; total_stock: number; remaining_stock: number
  pickup_date: string | null; pickup_start_time: string | null; pickup_end_time: string | null
  image_url: string | null; is_active: boolean
}

interface Props { shopId: string; pack?: Pack; isDuplicate?: boolean; onSuccess?: () => void }

export default function PackFormSimplified({ shopId, pack, isDuplicate = false, onSuccess }: Props) {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const isEditing = !!pack && !isDuplicate
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const getInitial = () => {
    if (pack && !isDuplicate) return {
      title: pack.title, description: pack.description || '', price_cents: pack.price_cents,
      original_price_cents: pack.original_price_cents || 0, total_stock: pack.total_stock,
      pickup_date: pack.pickup_date || '', pickup_start_time: pack.pickup_start_time?.slice(0, 5) || '',
      pickup_end_time: pack.pickup_end_time?.slice(0, 5) || '', image_url: pack.image_url || '', is_active: pack.is_active,
    }
    return {
      title: '', description: '', price_cents: 0, original_price_cents: 0, total_stock: 1,
      pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      pickup_start_time: '', pickup_end_time: '', image_url: '', is_active: true,
    }
  }

  const [formData, setFormData] = useState(getInitial())
  const pickupData = { pickup_date: formData.pickup_date, pickup_start_time: formData.pickup_start_time, pickup_end_time: formData.pickup_end_time }
  const basicData = { title: formData.title, description: formData.description, price_cents: formData.price_cents, original_price_cents: formData.original_price_cents, total_stock: formData.total_stock, image_url: formData.image_url }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('shops').select('logo_url').eq('id', shopId).maybeSingle()
      if (data?.logo_url && !formData.image_url && !isEditing) setFormData(prev => ({ ...prev, image_url: data.logo_url! }))
    }
    if (!isEditing) load()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!formData.title.trim()) { setError('El titulo es requerido'); setLoading(false); return }
    if (formData.price_cents <= 0) { setError('El precio debe ser mayor a 0'); setLoading(false); return }
    if (formData.total_stock <= 0) { setError('El stock debe ser mayor a 0'); setLoading(false); return }

    const packData = {
      shop_id: shopId, title: formData.title, description: formData.description || null,
      price_cents: formData.price_cents, original_price_cents: formData.original_price_cents || null,
      total_stock: formData.total_stock, remaining_stock: formData.total_stock,
      pickup_date: formData.pickup_date || null, pickup_start_time: formData.pickup_start_time || null,
      pickup_end_time: formData.pickup_end_time || null, image_url: formData.image_url || null,
      is_active: formData.is_active,
    }

    try {
      if (isEditing && pack) {
        const { error: err } = await supabase.from('packs').update(packData).eq('id', pack.id)
        if (err) throw err
        setSuccess('Pack actualizado correctamente')
      } else {
        const { error: err } = await supabase.from('packs').insert(packData)
        if (err) throw err
        setSuccess(isDuplicate ? 'Pack duplicado' : 'Pack creado correctamente')
      }
      setTimeout(() => { router.push('/business/packs'); onSuccess?.() }, 1500)
    } catch (err: any) { setError(err.message); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PackCategoryTemplates selectedCategory={selectedCategory} onSelect={(id, template) => {
        setSelectedCategory(id)
        setFormData(prev => ({ ...prev, title: template.title, description: template.description, price_cents: template.price_cents, original_price_cents: template.original_price_cents }))
      }} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PackFormBasicInfo data={basicData} onChange={(d) => setFormData(prev => ({ ...prev, ...d }))} shopId={shopId} onError={setError} />
        <PackFormPickupTime data={pickupData} onChange={(d) => setFormData(prev => ({ ...prev, ...d }))} />

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            <Package className="w-4 h-4 mr-2" />
            {loading ? 'Guardando...' : isEditing ? 'Actualizar Pack' : isDuplicate ? 'Duplicar Pack' : 'Crear Pack'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">Cancelar</Button>
        </div>
      </form>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
