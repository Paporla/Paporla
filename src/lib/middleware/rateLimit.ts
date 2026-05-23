import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const routeLimits: Record<string, { limit: number; window: number }> = {
  '/api/email': { limit: 10, window: 60 * 1000 },
  '/api/notifications': { limit: 30, window: 60 * 1000 },
  '/api/auth': { limit: 5, window: 60 * 1000 },
  '/api/reservations': { limit: 20, window: 60 * 1000 },
  '/api/cron': { limit: 5, window: 60 * 1000 },
  '/api/packs': { limit: 30, window: 60 * 1000 },
  '/api/search': { limit: 60, window: 60 * 1000 },
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (realIp) return realIp
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const resetAt = now + windowMs

  try {
    const { data: entry } = await supabase.from('rate_limits').select('count, reset_at').eq('id', key).maybeSingle()

    if (!entry || new Date(entry.reset_at).getTime() < now) {
      const { error } = await supabase
        .from('rate_limits')
        .upsert({ id: key, count: 1, reset_at: new Date(resetAt).toISOString() }, { onConflict: 'id' })

      if (error) {
        console.error('[RateLimit] Error upserting:', error)
        return { allowed: false, remaining: 0, resetAt }
      }
      return { allowed: true, remaining: limit - 1, resetAt }
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: new Date(entry.reset_at).getTime() }
    }

    const { data: updated, error } = await supabase
      .from('rate_limits')
      .update({ count: entry.count + 1 })
      .eq('id', key)
      .lt('count', limit)
      .select('count, reset_at')
      .maybeSingle()

    if (error) {
      console.error('[RateLimit] Error updating:', error)
      return { allowed: false, remaining: 0, resetAt }
    }

    if (!updated) {
      return { allowed: false, remaining: 0, resetAt: new Date(entry.reset_at).getTime() }
    }

    return { allowed: true, remaining: limit - updated.count, resetAt: new Date(updated.reset_at).getTime() }
  } catch (err) {
    console.error('[RateLimit] Unexpected error:', err)
    return { allowed: false, remaining: 0, resetAt: now + windowMs }
  }
}

export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname

  let matchedRoute: string | null = null
  for (const route of Object.keys(routeLimits)) {
    if (path.startsWith(route)) {
      matchedRoute = route
      break
    }
  }

  if (!matchedRoute) return null

  const { limit, window } = routeLimits[matchedRoute]
  const clientIp = getClientIp(request)
  const rateLimitKey = `${matchedRoute}:${clientIp}`
  const result = await checkRateLimit(rateLimitKey, limit, window)

  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString())

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
      { status: 429, headers: { 'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString() } },
    )
  }

  return response
}
