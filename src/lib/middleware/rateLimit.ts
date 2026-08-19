import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  blockedUntil: number | null
}

interface RateLimitRpcPayload {
  allowed: boolean
  remaining: number
  reset_at: string
  blocked_until: string | null
}

const routeLimits: Record<string, { limit: number; windowSeconds: number }> = {
  '/api/email': { limit: 10, windowSeconds: 60 },
  '/api/notifications': { limit: 30, windowSeconds: 60 },
  '/api/auth': { limit: 5, windowSeconds: 60 },
  '/api/reservations': { limit: 20, windowSeconds: 60 },
  '/api/cron': { limit: 5, windowSeconds: 60 },
  '/api/packs': { limit: 30, windowSeconds: 60 },
  '/api/search': { limit: 60, windowSeconds: 60 },
  '/api/admin': { limit: 30, windowSeconds: 60 },
  '/api/stats': { limit: 60, windowSeconds: 60 },
  '/api/health': { limit: 120, windowSeconds: 60 },
}

export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')
  const forwarded = request.headers.get('x-forwarded-for')

  if (realIp) return realIp.trim()
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

async function sha256Bytea(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `\\x${hex}`
}

function isRateLimitPayload(value: unknown): value is RateLimitRpcPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<RateLimitRpcPayload>
  return (
    typeof payload.allowed === 'boolean' &&
    typeof payload.remaining === 'number' &&
    typeof payload.reset_at === 'string' &&
    (payload.blocked_until === null || typeof payload.blocked_until === 'string')
  )
}

async function checkCanonicalRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  try {
    const identifierHash = await sha256Bytea(`ip:${identifier}`)
    const keyHash = await sha256Bytea(`ip:${action}:${identifier}`)
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.rpc('service_check_rate_limit', {
      p_key_hash: keyHash,
      p_identifier_hash: identifierHash,
      p_scope: 'ip',
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_block_seconds: 0,
    })

    if (error) throw error
    if (!isRateLimitPayload(data)) throw new Error('INVALID_RATE_LIMIT_RESPONSE')

    const resetAt = Date.parse(data.reset_at)
    const blockedUntil = data.blocked_until ? Date.parse(data.blocked_until) : null
    if (!Number.isFinite(resetAt) || (blockedUntil !== null && !Number.isFinite(blockedUntil))) {
      throw new Error('INVALID_RATE_LIMIT_TIMESTAMPS')
    }

    return {
      allowed: data.allowed,
      remaining: Math.max(0, data.remaining),
      resetAt,
      blockedUntil,
    }
  } catch (error) {
    // Disponibilidad controlada: Supabase Auth mantiene sus propios límites y el
    // resto de endpoints conserva sus controles de autorización. Un fallo del
    // limitador se registra, pero no convierte toda la API en un 429 permanente.
    logger.error('RateLimit service_check_rate_limit', error)
    return null
  }
}

function rateLimitHeaders(limit: number, result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  }
}

export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname
  const matchedRoute = Object.keys(routeLimits).find((route) => path.startsWith(route))
  if (!matchedRoute) return null

  const { limit, windowSeconds } = routeLimits[matchedRoute]
  const result = await checkCanonicalRateLimit(getClientIp(request), matchedRoute, limit, windowSeconds)

  // Si el RPC no está disponible, continuar y dejar registro de observabilidad.
  if (!result) return null

  const headers = rateLimitHeaders(limit, result)
  if (!result.allowed) {
    const retryAt = result.blockedUntil ?? result.resetAt
    const retryAfter = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))

    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
      { status: 429, headers: { ...headers, 'Retry-After': retryAfter.toString() } },
    )
  }

  const response = NextResponse.next()
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
  return response
}
