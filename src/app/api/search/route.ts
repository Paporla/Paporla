import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'packs'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)))
  const offset = (page - 1) * pageSize

  const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined
  const city = searchParams.get('city') || ''
  const availableOnly = searchParams.get('available') === 'true'

  const now = new Date().toISOString()

  try {
    if (type === 'shops') {
      let builder = supabase
        .from('shops')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)

      if (query) {
        builder = builder.textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
      }

      if (city) {
        builder = builder.ilike('city', `%${city}%`)
      }

      builder = builder.order('rating', { ascending: false }).range(offset, offset + pageSize - 1)

      const { data, error, count } = await builder

      if (error) throw error

      return NextResponse.json({
        results: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      })
    }

    let builder = supabase
      .from('packs')
      .select(`
        *,
        shop:shops (
          id,
          name,
          address,
          city,
          phone,
          verified,
          rating,
          logo_url
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .is('deleted_at', null)

    if (availableOnly) {
      builder = builder.gt('remaining_stock', 0)
    }

    builder = builder.or(`pickup_date.is.null,pickup_end_time.is.null,and(pickup_date.not.is.null,pickup_end_time.not.is.null,concat(pickup_date,' ',pickup_end_time).gt.${now})`)

    if (query) {
      builder = builder.textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
    }

    if (minPrice !== undefined) {
      builder = builder.gte('price_cents', minPrice)
    }

    if (maxPrice !== undefined) {
      builder = builder.lte('price_cents', maxPrice)
    }

    if (city) {
      builder = builder.eq('shop.city', city)
    }

    builder = builder.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

    const { data, error, count } = await builder

    if (error) throw error

    return NextResponse.json({
      results: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('[Search] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en la búsqueda' },
      { status: 500 }
    )
  }
}
