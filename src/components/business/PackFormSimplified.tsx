'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import { supabaseBrowser } from '@/lib/supabase/client'
import PackCategoryTemplates from './packs/PackCategoryTemplates'
import PackFormBasicInfo from './packs/PackFormBasicInfo'
import PackFormPickupTime from './packs/PackFormPickupTime'

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

export default function PackFormSimplified({
  shopId,
  pack,
  isDuplicate = false,
  onSuccess,
}: Props) {
  const router = useRouter()
  const supabase = supabaseBrowser()
  const isEditing = !!pack && !isDuplicate
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [shopLogo, setShopLogo] = useState<string | null>(null)

  // Obtener logo del comercio para packs nuevos
  useEffect(() => {
    const loadShopLogo = async () => {
      if (!isEditing) {
        const { data } = await supabase
          .from('shops')
          .select('logo_url')
          .eq('id', shopId)
          .maybeSingle()
        if (data?.logo_url) {
          setShopLogo(data.logo_url)
        }
      }
    }
    loadShopLogo()
  }, [shopId, isEditing, supabase])

  const getInitialData = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    if (pack && !isDuplicate) {
      return {
        title: pack.title,
        description: pack.description || '',
        price_cents: pack.price_cents,
        original_price_cents: pack.original_price_cents || 0,
        total_stock: pack.total_stock,
        pickup_date: pack.pickup_date || tomorrow,
        pickup_start_time: pack.pickup_start_time?.slice(0, 5) || '',
        pickup_end_time: pack.pickup_end_time?.slice(0, 5) || '',
        image_url: pack.image_url || shopLogo || '',
        is_active: pack.is_active,
      }
    }

    return {
      title: '',
      description: '',
      price_cents: 0,
      original_price_cents: 0,
      total_stock: 1,
      pickup_date: tomorrow,
      pickup_start_time: '',
      pickup_end_time: '',
      image_url: shopLogo || '',
      is_active: true,
    }
  }

  const [formData, setFormData] = useState(getInitialData())

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

  // Validar formulario antes de enviar
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('El título es requerido')
      return false
    }

    if (formData.price_cents <= 0) {
      setError('El precio debe ser mayor a 0')
      return false
    }

    if (formData.total_stock <= 0) {
      setError('El stock debe ser mayor a 0')
      return false
    }

    // Validar fecha de recogida (debe ser hoy o futura)
    if (formData.pickup_date) {
      const pickupDate = new Date(formData.pickup_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (pickupDate < today) {
        setError('La fecha de recogida debe ser hoy o futura')
        return false
      }
    }

    // Validar horas de recogida
    if (formData.pickup_start_time && formData.pickup_end_time) {
      if (formData.pickup_start_time >= formData.pickup_end_time) {
        setError('La hora de fin debe ser posterior a la hora de inicio')
        return false
      }

      // Validar que no sea en el pasado si es hoy
      if (formData.pickup_date) {
        const pickupDate = new Date(formData.pickup_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (pickupDate.getTime() === today.getTime()) {
          const [startHours, startMinutes] = formData.pickup_start_time.split(':').map(Number)
          const now = new Date()
          const startTime = new Date()
          startTime.setHours(startHours, startMinutes, 0, 0)

          if (startTime < now) {
            setError('La hora de inicio no puede ser en el pasado')
            return false
          }
        }
      }
    }

    return true
  }

  // Calcular timestamps para starts_at y ends_at
  const calculateTimestamps = () => {
    let startsAt: string | null = null
    let endsAt: string | null = null

    if (formData.pickup_date && formData.pickup_start_time) {
      startsAt = new Date(
        `${formData.pickup_date}T${formData.pickup_start_time}:00`
      ).toISOString()
    }

    if (formData.pickup_date && formData.pickup_end_time) {
      endsAt = new Date(
        `${formData.pickup_date}T${formData.pickup_end_time}:00`
      ).toISOString()
    }

    return { startsAt, endsAt }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validar formulario
    if (!validateForm()) {
      setLoading(false)
      return
    }

    // Calcular timestamps
    const { startsAt, endsAt } = calculateTimestamps()

    // Preparar datos del pack
    const packData: Record<string, any> = {
      shop_id: shopId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      price_cents: formData.price_cents,
      original_price_cents: formData.original_price_cents || null,
      total_stock: formData.total_stock,
      pickup_date: formData.pickup_date || null,
      pickup_start_time: formData.pickup_start_time || null,
      pickup_end_time: formData.pickup_end_time || null,
      starts_at: startsAt,
      ends_at: endsAt,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    // En creación, establecer remaining_stock igual a total_stock
    if (!isEditing) {
      packData.remaining_stock = formData.total_stock
      packData.status = 'active'
      packData.created_at = new Date().toISOString()
    }
    // En edición, NO modificar remaining_stock (se maneja por reservas)
    // Solo actualizar si hay cambio explícito de stock total

    try {
      if (isEditing && pack) {
        // Actualizar pack existente
        const { error: err } = await supabase
          .from('packs')
          .update(packData)
          .eq('id', pack.id)
          .eq('shop_id', shopId) // Seguridad adicional

        if (err) throw err

        setSuccess('✅ Pack actualizado correctamente')
      } else {
        // Crear nuevo pack
        const { error: err } = await supabase.from('packs').insert(packData)

        if (err) throw err

        setSuccess(isDuplicate ? '✅ Pack duplicado correctamente' : '✅ Pack creado correctamente')
      }

      // Esperar y redirigir
      setTimeout(() => {
        router.push('/business/packs')
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      console.error('Error al guardar pack:', err)
      setError(err.message || 'Error al guardar el pack')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates de categorías */}
      <PackCategoryTemplates
        selectedCategory={selectedCategory}
        onSelect={(id, template) => {
          setSelectedCategory(id)
          setFormData((prev) => ({
            ...prev,
            title: template.title,
            description: template.description,
            price_cents: template.price_cents,
            original_price_cents: template.original_price_cents,
          }))
        }}
      />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <PackFormBasicInfo
          data={basicData}
          onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
          shopId={shopId}
          onError={setError}
        />

        <PackFormPickupTime
          data={pickupData}
          onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
        />

        {/* Mensajes de estado */}
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
              <h3 className="text-sm font-semibold text-green-200">Éxito</h3>
              <p className="text-sm text-green-100/70 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
            loading={loading}
          >
            <Package className="w-4 h-4 mr-2" />
            {loading
              ? 'Guardando...'
              : isEditing
              ? 'Actualizar Pack'
              : isDuplicate
              ? 'Duplicar Pack'
              : 'Crear Pack'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </form>

      {/* Toast notifications (opcional, si usas el componente Toast) */}
      {error && (
        <Toast message={error} type="error" onClose={() => setError('')} />
      )}
      {success && (
        <Toast message={success} type="success" onClose={() => setSuccess('')} />
      )}
    </div>
  )
}