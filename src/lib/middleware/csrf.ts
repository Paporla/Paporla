import { NextRequest, NextResponse } from 'next/server'

// ============================================
// CSRF Protection — Double-submit cookie pattern
// ============================================
//
// Genera un token CSRF por sesión, lo almacena en una cookie
// y exige que las mutaciones API incluyan el mismo token
// en el header X-CSRF-Token.
//
// La cookie NO tiene HttpOnly para que el cliente JS pueda leerla
// y enviarla de vuelta en el header. Esto es seguro porque:
// - Un atacante en otro dominio no puede leer la cookie (SameSite Lax)
// - Un atacante no puede escribir el header desde otro origen (CORS)

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'X-CSRF-Token'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Aplica la cookie CSRF a la respuesta si no existe.
 * Debe llamarse en middleware.ts en la respuesta next().
 */
export function setCsrfCookie(response: NextResponse, existingToken?: string): string {
  const token = existingToken ?? generateToken()
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // El cliente necesita leerla para enviarla en el header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 horas
  })
  return token
}

/**
 * Valida que la petición incluya el token CSRF correcto.
 * Retorna null si es válido, o un NextResponse de error si no.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  // Solo validar mutaciones
  const method = request.method
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken) {
    return NextResponse.json({ success: false, error: 'Token CSRF requerido para mutaciones' }, { status: 403 })
  }

  // Comparación en tiempo constante para evitar timing attacks
  if (cookieToken.length !== headerToken.length) {
    return NextResponse.json({ success: false, error: 'Token CSRF inválido' }, { status: 403 })
  }

  // Comparación en tiempo constante (Web Crypto no tiene timingSafeEqual)
  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  const valid = result === 0
  if (!valid) {
    return NextResponse.json({ success: false, error: 'Token CSRF inválido' }, { status: 403 })
  }

  return null
}
