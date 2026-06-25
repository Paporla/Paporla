import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyRateLimit } from '@/lib/middleware/rateLimit'
import { ROLES, isAdmin } from '@/lib/constants/roles'

export async function middleware(request: NextRequest) {
  // Rate limiting para API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const rateLimitResponse = await applyRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$).*)'],
}
