import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50
const MAX_PRICE_CENTS = 1_000_000_00

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

function safeParseInt(value: string | null, defaultValue: number, min: number, max: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return defaultValue
  return Math.max(min, Math.min(max, parsed))
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'packs'
  const page = safeParseInt(searchParams.get('page'), 1, 1, 10000)
  const pageSize = safeParseInt(searchParams.get('limit'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
  const offset = (page - 1) * pageSize

  const minPrice = safeParseInt(searchParams.get('minPrice'), 0, 0, MAX_PRICE_CENTS)
  const maxPrice = safeParseInt(searchParams.get('maxPrice'), MAX_PRICE_CENTS, 0, MAX_PRICE_CENTS)
  const city = searchParams.get('city') || ''
  const availableOnly = searchParams.get('available') === 'true'

  const now = new Date().toISOString()

  try {
    if (type === 'shops') {
      let builder = supabase.from('shops').select('*', { count: 'exact' }).is('deleted_at', null)

      if (query) {
        builder = builder.textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
      }

      if (city && city.length <= 100) {
        builder = builder.ilike('city', `%${city}%`)
      }

      builder = builder.order('rating', { ascending: false }).range(offset, offset + pageSize - 1)

      const { data, error, count } = await builder

      if (error) throw error

      return NextResponse.json(
        {
          success: true,
          results: data ?? [],
          total: count ?? 0,
          page,
          pageSize,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        },
        { headers: cacheHeaders },
      )
    }

    let builder = supabase
      .from('packs')
      .select(
        `
        *,
        shop:shops (id, name, address, city, phone, verified, rating, logo_url)
      `,
        { count: 'exact' },
      )
      .eq('is_active', true)
      .is('deleted_at', null)

    if (availableOnly) {
      builder = builder.gt('remaining_stock', 0)
    }

    const filterOr = `pickup_date.is.null,pickup_end_time.is.null,and(pickup_date.not.is.null,pickup_end_time.not.is.null,concat(pickup_date,' ',pickup_end_time).gt.${now})`
    builder = builder.or(filterOr)

    if (query) {
      builder = builder.textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
    }

    if (minPrice > 0) {
      builder = builder.gte('price_cents', minPrice)
    }

    if (maxPrice < MAX_PRICE_CENTS) {
      builder = builder.lte('price_cents', maxPrice)
    }

    if (city && city.length <= 100) {
      builder = builder.eq('shop.city', city)
    }

    builder = builder.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

    const { data, error, count } = await builder

    if (error) throw error

    return NextResponse.json(
      {
        success: true,
        results: data ?? [],
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
      { headers: cacheHeaders },
    )
  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error en la búsqueda' },
      { status: 500 },
    )
  }
}
