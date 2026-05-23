export interface PackFormData {
  title: string
  description: string
  price_cents: number
  original_price_cents: number
  total_stock: number
  pickup_date: string
  pickup_start_time: string
  pickup_end_time: string
  image_url: string
  is_active: boolean
}

export interface PackFormErrors {
  title?: string
  price_cents?: string
  total_stock?: string
  pickup_date?: string
  pickup_start_time?: string
  pickup_end_time?: string
  general?: string
}

export function validatePackForm(data: PackFormData): PackFormErrors {
  const errors: PackFormErrors = {}

  if (!data.title.trim()) {
    errors.title = 'El titulo es requerido'
  }

  if (data.price_cents <= 0) {
    errors.price_cents = 'El precio debe ser mayor a 0'
  }

  if (data.total_stock <= 0) {
    errors.total_stock = 'El stock debe ser mayor a 0'
  }

  if (data.pickup_date) {
    const pickupDate = new Date(data.pickup_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (pickupDate < today) {
      errors.pickup_date = 'La fecha de recogida debe ser hoy o futura'
    }
  }

  if (data.pickup_start_time && data.pickup_end_time) {
    if (data.pickup_start_time >= data.pickup_end_time) {
      errors.pickup_end_time = 'La hora de fin debe ser posterior a la hora de inicio'
    }

    if (data.pickup_date) {
      const pickupDate = new Date(data.pickup_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (pickupDate.getTime() === today.getTime()) {
        const [startHours, startMinutes] = data.pickup_start_time.split(':').map(Number)
        const now = new Date()
        const startTime = new Date()
        startTime.setHours(startHours, startMinutes, 0, 0)

        if (startTime < now) {
          errors.pickup_start_time = 'La hora de inicio no puede ser en el pasado'
        }
      }
    }
  }

  return errors
}

export function calculateTimestamps(pickupDate: string, startTime: string, endTime: string) {
  let startsAt: string | null = null
  let endsAt: string | null = null

  if (pickupDate && startTime) {
    startsAt = new Date(`${pickupDate}T${startTime}:00`).toISOString()
  }

  if (pickupDate && endTime) {
    endsAt = new Date(`${pickupDate}T${endTime}:00`).toISOString()
  }

  return { startsAt, endsAt }
}

export function getDefaultPackData(_shopId: string): PackFormData {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  return {
    title: '',
    description: '',
    price_cents: 0,
    original_price_cents: 0,
    total_stock: 1,
    pickup_date: tomorrow,
    pickup_start_time: '',
    pickup_end_time: '',
    image_url: '',
    is_active: true,
  }
}

export function packToFormData(pack: {
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  total_stock: number
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  image_url: string | null
  is_active: boolean
  shopLogo?: string | null
}): PackFormData {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  return {
    title: pack.title,
    description: pack.description || '',
    price_cents: pack.price_cents,
    original_price_cents: pack.original_price_cents || 0,
    total_stock: pack.total_stock,
    pickup_date: pack.pickup_date || tomorrow,
    pickup_start_time: pack.pickup_start_time?.slice(0, 5) || '',
    pickup_end_time: pack.pickup_end_time?.slice(0, 5) || '',
    image_url: pack.image_url || pack.shopLogo || '',
    is_active: pack.is_active,
  }
}

export interface PackInsertData {
  shop_id: string
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  total_stock: number
  remaining_stock?: number
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  starts_at: string | null
  ends_at: string | null
  image_url: string | null
  is_active: boolean
  status?: string
}

export function buildPackInsertData(shopId: string, data: PackFormData, isNew: boolean): PackInsertData {
  const { startsAt, endsAt } = calculateTimestamps(data.pickup_date, data.pickup_start_time, data.pickup_end_time)
  const packData: PackInsertData = {
    shop_id: shopId,
    title: data.title.trim(),
    description: data.description.trim() || null,
    price_cents: data.price_cents,
    original_price_cents: data.original_price_cents || null,
    total_stock: data.total_stock,
    pickup_date: data.pickup_date || null,
    pickup_start_time: data.pickup_start_time || null,
    pickup_end_time: data.pickup_end_time || null,
    starts_at: startsAt,
    ends_at: endsAt,
    image_url: data.image_url || null,
    is_active: data.is_active,
  }

  if (isNew) {
    packData.remaining_stock = data.total_stock
    packData.status = 'active'
  }

  return packData
}
