import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_LIMIT = 60
const DEFAULT_WINDOW = 60 * 1000

const routeLimits: Record<string, { limit: number; window: number }> = {
  '/api/email': { limit: 10, window: 60 * 1000 },
  '/api/notifications': { limit: 30, window: 60 * 1000 },
  '/api/auth': { limit: 5, window: 60 * 1000 },
  '/api/reservations': { limit: 20, window: 60 * 1000 },
  '/api/cron': { limit: 5, window: 60 * 1000 },
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const resetAt = now + windowMs

  try {
    const { data: entry } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('id', key)
      .single()

    if (!entry || new Date(entry.reset_at).getTime() < now) {
      await supabase
        .from('rate_limits')
        .upsert({ id: key, count: 1, reset_at: new Date(resetAt).toISOString() }, { onConflict: 'id' })
      return { allowed: true, remaining: limit - 1, resetAt }
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: new Date(entry.reset_at).getTime() }
    }

    await supabase
      .from('rate_limits')
      .update({ count: entry.count + 1 })
      .eq('id', key)

    return { allowed: true, remaining: limit - entry.count - 1, resetAt: new Date(entry.reset_at).getTime() }
  } catch {
    return { allowed: true, remaining: limit - 1, resetAt }
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
      { status: 429, headers: { 'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString() } }
    )
  }

  return response
}
