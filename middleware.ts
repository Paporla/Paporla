import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
    // Permitir acceso a la pagina de mantenimiento y recursos estaticos
    if (path !== '/mantenimiento' && !path.startsWith('/_next') && !path.startsWith('/api') && !path.startsWith('/favicon')) {
      return NextResponse.redirect(new URL('/mantenimiento', request.url))
    }
    // Si ya esta en /mantenimiento, seguir
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const publicPaths = ['/', '/login', '/register', '/faq', '/about', '/forgot-password', '/reset-password']

  const isPublicPath =
    publicPaths.includes(path) ||
    path.startsWith('/auth/') ||
    path.startsWith('/legal/') ||
    path.startsWith('/packs') ||
    path.startsWith('/shops') ||
    path.startsWith('/callback')

  const isDashboardPath = path.startsWith('/dashboard') || path.startsWith('/profile') || path.startsWith('/notifications') || path.startsWith('/favorites') || path.startsWith('/reservations')
  const isBusinessPath = path.startsWith('/business')
  const isAdminPath = path.startsWith('/admin')
  const isAuthPage = path === '/login' || path === '/register'

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let role = 'user'

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    role = profile?.role || 'user'
  }

  // Si ya esta logueado y entra a login/register, redirigir a su panel
  if (user && isAuthPage) {
    const dest = role === 'comercio' ? '/business' : role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Proteccion por roles
  if (user && isDashboardPath && role !== 'user') {
    const dest = role === 'comercio' ? '/business' : '/admin'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (user && isBusinessPath && role !== 'comercio' && role !== 'admin' && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && isAdminPath && role !== 'admin' && role !== 'super_admin') {
    const dest = role === 'comercio' ? '/business' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$).*)'],
}
