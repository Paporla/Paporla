import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ============================================
// In-memory rate limiter (capa 1)
// ============================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

// Limpieza periódica de entries expiradas (cada 60 segundos)
const CLEANUP_INTERVAL_MS = 60 * 1000
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)
// No bloquear el cierre del proceso (importante en serverless)
cleanupTimer.unref()

// ============================================
// Configuración de rutas
// ============================================

const routeLimits: Record<string, { limit: number; window: number }> = {
  '/api/email': { limit: 10, window: 60 * 1000 },
  '/api/notifications': { limit: 30, window: 60 * 1000 },
  '/api/auth': { limit: 5, window: 60 * 1000 },
  '/api/reservations': { limit: 20, window: 60 * 1000 },
  '/api/cron': { limit: 5, window: 60 * 1000 },
  '/api/packs': { limit: 30, window: 60 * 1000 },
  '/api/search': { limit: 60, window: 60 * 1000 },
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (realIp) return realIp
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

// ============================================
// Capa 1: Rate limiter en memoria (rápido, sin red)
// ============================================

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number; fromMemory: boolean } {
  const now = Date.now()
  const entry = memoryStore.get(key)

  // No hay entry en memoria → indicar que se debe usar fallback (serverless cold start)
  if (!entry) {
    return { allowed: false, remaining: 0, resetAt: now + windowMs, fromMemory: false }
  }

  // Entry expirada → limpiar y también usar fallback
  if (now > entry.resetAt) {
    memoryStore.delete(key)
    return { allowed: false, remaining: 0, resetAt: now + windowMs, fromMemory: false }
  }

  // Límite excedido
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, fromMemory: true }
  }

  // Incrementar contador
  entry.count += 1
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt, fromMemory: true }
}

// ============================================
// Capa 2: Rate limiter en Supabase (fallback para serverless)
// ============================================

async function checkSupabaseRateLimit(
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

// ============================================
// Interfaz pública (sin cambios)
// ============================================

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

  // Capa 1: intentar en memoria primero
  const memResult = checkMemoryRateLimit(rateLimitKey, limit, window)

  // Si la memoria tenía la entry, usar ese resultado (rápido)
  if (memResult.fromMemory) {
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', memResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', memResult.resetAt.toString())

    if (!memResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((memResult.resetAt - Date.now()) / 1000).toString() } },
      )
    }

    return response
  }

  // Capa 2: fallback a Supabase (serverless: el Map se perdió entre invocaciones)
  const result = await checkSupabaseRateLimit(rateLimitKey, limit, window)

  // Sembrar el resultado en memoria para requests siguientes dentro del mismo warm instance
  if (result.allowed) {
    memoryStore.set(rateLimitKey, { count: limit - result.remaining, resetAt: result.resetAt })
  } else {
    memoryStore.set(rateLimitKey, { count: limit, resetAt: result.resetAt })
  }

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
