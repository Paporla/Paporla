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
  // A-03: el formulario de contacto es público (sin sesión), así que el tope
  // es mucho más bajo que el del resto: 5 mensajes cada 5 minutos por IP.
  // Sin esto, una sola persona podría vaciar la bandeja de soporte en segundos.
  '/api/contacto': { limit: 5, windowSeconds: 300 },
  '/api/email': { limit: 10, windowSeconds: 60 },
  '/api/auth': { limit: 5, windowSeconds: 60 },
  '/api/reservations': { limit: 20, windowSeconds: 60 },
  '/api/cron': { limit: 5, windowSeconds: 60 },
  '/api/admin': { limit: 30, windowSeconds: 60 },
  '/api/stats': { limit: 60, windowSeconds: 60 },
  '/api/health': { limit: 120, windowSeconds: 60 },
}

/**
 * IP del cliente para el rate limit.
 *
 * Modelo de confianza (auditoría 2026-09-01, S1): este código corre en el
 * edge de Vercel, donde la plataforma SOBREESCRIBE `x-real-ip` con la IP real
 * de la conexión — un cliente no puede falsificarla. `x-forwarded-for` es el
 * respaldo (el primer salto lo fija también el proxy de Vercel).
 *
 * Si no hay ninguna cabecera (tests, entornos raros), antes se devolvía
 * 'unknown': UN SOLO cubo compartido por todos los clientes sin cabecera, de
 * modo que un atacante podía agotar el límite y denegar el servicio a los
 * demás (denegación colateral). Ahora cada petición sin cabecera recibe un
 * identificador propio derivado de `x-vercel-id` (único por request) o un
 * UUID: el limitador simplemente no agrupa lo que no puede identificar.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  const firstHop = forwarded?.split(',')[0]?.trim()
  if (firstHop) return firstHop

  const anonId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  return `anon:${anonId}`
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

/**
 * Limitador LOCAL de emergencia (AI-03).
 *
 * Antes, si el RPC de rate limit fallaba (caída de Supabase, timeout, respuesta
 * rara), `checkCanonicalRateLimit` devolvía null y la petición pasaba SIN
 * límite alguno: fallar abierto en el formulario público de contacto permite
 * vaciar la bandeja de soporte justo cuando la base está caída.
 *
 * Ahora, sobre un fallo, se aplica este limitador en memoria del propio
 * isolate: ventana deslizante por identificador y ruta. En el edge de Vercel
 * la memoria es por instancia, así que no es tan fuerte como el contador
 * centralizado de la base, pero cierra la puerta: nadie puede hacer más de
 * `limit` peticiones por ventana en la instancia que le atendió.
 *
 * El mapa tiene tope de claves para que un ataque de IPs dispersas no pueda
 * comerse la memoria: al llenarse, se evicta la entrada más antigua.
 */
const fallbackBuckets = new Map<string, number[]>()
const FALLBACK_MAX_KEYS = 5000

function fallbackRateLimit(identifier: string, action: string, limit: number, windowSeconds: number): RateLimitResult {
  const key = `${action}:${identifier}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const stamps = (fallbackBuckets.get(key) ?? []).filter((t) => now - t < windowMs)
  const allowed = stamps.length < limit
  if (allowed) stamps.push(now)
  fallbackBuckets.set(key, stamps)
  if (fallbackBuckets.size > FALLBACK_MAX_KEYS) {
    const oldest = fallbackBuckets.keys().next().value
    if (oldest !== undefined) fallbackBuckets.delete(oldest)
  }
  return {
    allowed,
    remaining: Math.max(0, limit - stamps.length),
    resetAt: (stamps[0] ?? now) + windowMs,
    blockedUntil: null,
  }
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
    // AI-03: ya no se falla abierto. Un fallo del limitador centralizado se
    // registra y se delega en el limitador local de emergencia, que sigue
    // poniendo tope por IP y ruta en esta instancia.
    logger.error('RateLimit service_check_rate_limit', error)
    return fallbackRateLimit(identifier, action, limit, windowSeconds)
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
