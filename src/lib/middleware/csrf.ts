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
 * Comparacion en tiempo constante para evitar timing attacks.
 *
 * El runtime edge no expone crypto.timingSafeEqual, asi que se recorre el
 * string completo sin cortocircuito: el resultado no depende de en que
 * posicion difieren los dos valores. Lo usan el CSRF (token doble) y
 * validateCronRequest (mismo patrón, f8.5 S5).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
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
  if (!constantTimeEqual(cookieToken, headerToken)) {
    return NextResponse.json({ success: false, error: 'Token CSRF inválido' }, { status: 403 })
  }

  return null
}
