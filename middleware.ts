import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyRateLimit } from '@/lib/middleware/rateLimit'
import { setCsrfCookie, validateCsrf } from '@/lib/middleware/csrf'
import { ROLES, isAdmin } from '@/lib/constants/roles'

// ============================================
// CSP — Nonce-based (replaces static 'unsafe-inline')
// ============================================
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    `connect-src 'self' https://*.supabase.co https://*.sentry.io https://www.google-analytics.com`,
    "frame-src 'self' https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()

  // ============================================
  // CSRF validation para mutaciones API
  // ============================================
  if (request.nextUrl.pathname.startsWith('/api')) {
    const csrfError = validateCsrf(request)
    if (csrfError) return csrfError

    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // Inject nonce into request header so server components can read it via headers()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // ============================================
  // CSP — Nonce-based
  // ============================================
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce))

  // ============================================
  // CSRF — Set cookie on every non-API response
  // ============================================
  if (!request.nextUrl.pathname.startsWith('/api')) {
    setCsrfCookie(response, request.cookies.get('csrf_token')?.value)
  }

  // ============================================
  // MODO MANTENIMIENTO
  // ============================================
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    const path = request.nextUrl.pathname
    if (
      path !== '/mantenimiento' &&
      !path.startsWith('/_next') &&
      !path.startsWith('/api') &&
      !path.startsWith('/favicon')
    ) {
      return NextResponse.redirect(new URL('/mantenimiento', request.url))
    }
    return response
  }

  // ============================================
  // HSTS header
  // ============================================
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; [key: string]: unknown }[]) {
          cookiesToSet.forEach(
            ({ name, value, ...options }: { name: string; value: string; [key: string]: unknown }) => {
              request.cookies.set({ name, value, ...options })
              response.cookies.set({ name, value, ...options })
            },
          )
        },
      },
    },
  )

  const path = request.nextUrl.pathname
  const publicPaths = ['/', '/login', '/register', '/faq', '/about', '/forgot-password', '/reset-password']
  const isPublicPath =
    publicPaths.includes(path) ||
    path.startsWith('/auth/') ||
    path.startsWith('/legal/') ||
    path.startsWith('/packs') ||
    path.startsWith('/shops') ||
    path.startsWith('/contacto') ||
    path.startsWith('/callback') ||
    path.startsWith('/api') ||
    path.startsWith('/mantenimiento')

  const isDashboardPath =
    path.startsWith('/dashboard') ||
    path.startsWith('/profile') ||
    path.startsWith('/notifications') ||
    path.startsWith('/favorites') ||
    path.startsWith('/reservations')
  const isBusinessPath = path.startsWith('/business')
  const isAdminPath = path.startsWith('/admin')
  const isAuthPage = path === '/login' || path === '/register'

  if (!isPublicPath || isDashboardPath || isBusinessPath || isAdminPath) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session && !isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (session) {
      const role = (session.user.user_metadata?.role as string) || ROLES.USER

      if (isAuthPage) {
        const dest = role === ROLES.COMERCIO ? '/business' : isAdmin(role) ? '/admin' : '/dashboard'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      if (isDashboardPath && role !== ROLES.USER) {
        return NextResponse.redirect(new URL(role === ROLES.COMERCIO ? '/business' : '/admin', request.url))
      }
      if (isBusinessPath && role !== ROLES.COMERCIO && !isAdmin(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (isAdminPath && !isAdmin(role)) {
        return NextResponse.redirect(new URL(role === ROLES.COMERCIO ? '/business' : '/dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$).*)',
  ],
}
