import { NextResponse, type NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

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

function checkRateLimit(key: string, limit: number, window: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + window })
    return { allowed: true, remaining: limit - 1, resetAt: now + window }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function applyRateLimit(request: NextRequest): NextResponse | null {
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
  const result = checkRateLimit(rateLimitKey, limit, window)

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
