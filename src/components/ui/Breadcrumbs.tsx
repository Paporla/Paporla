'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Panel',
  business: 'Mi Negocio',
  admin: 'Administracion',
  packs: 'Packs',
  shops: 'Comercios',
  users: 'Usuarios',
  stats: 'Estadisticas',
  reservations: 'Reservas',
  profile: 'Mi Perfil',
  faq: 'Preguntas Frecuentes',
  about: 'Sobre Nosotros',
  contacto: 'Contacto',
  favorites: 'Favoritos',
  notifications: 'Notificaciones',
  new: 'Crear',
  duplicate: 'Duplicar',
  edit: 'Editar',
  login: 'Iniciar Sesión',
  register: 'Registrarse',
  'forgot-password': 'Recuperar Contraseña',
  'reset-password': 'Restablecer Contraseña',
  legal: 'Legal',
  terminos: 'Terminos y Condiciones',
  privacidad: 'Politica de Privacidad',
  cookies: 'Politica de Cookies',
  'politicas-retiro': 'Politicas de Retiro',
  'legal-bases': 'Bases Legales',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ID_REGEX = /^[0-9a-f]{20,}$/i

function isDynamicSegment(segment: string): boolean {
  return UUID_REGEX.test(segment) || ID_REGEX.test(segment)
}

export default function Breadcrumbs() {
  const pathname = usePathname()

  if (pathname === '/') return null

  const authPaths = ['login', 'register', 'forgot-password', 'reset-password']
  if (authPaths.some((authPath) => pathname.includes(authPath))) return null

  const pathSegments = pathname.split('/').filter((segment) => segment !== '')

  const breadcrumbs = [{ href: '/', label: 'Inicio' }]

  let currentPath = ''
  for (const segment of pathSegments) {
    currentPath += `/${segment}`

    if (isDynamicSegment(segment)) {
      breadcrumbs.push({ href: currentPath, label: 'Detalle' })
    } else {
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      breadcrumbs.push({ href: currentPath, label })
    }
  }

  if (breadcrumbs.length <= 2 && breadcrumbs[1]?.href === '/') return null

  return (
    <div className="border-b dark:border-gray-700 dark:bg-transparent bg-gray-50/80">
      <div className="container mx-auto px-4">
        <div className="py-2.5">
          <nav className="flex items-center gap-1 text-xs md:text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <div key={item.href} className="flex items-center">
                  {!isLast ? (
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 dark:text-gray-400 text-gray-500 hover:text-primary transition-colors"
                    >
                      {index === 0 && <Home className="w-3 h-3" />}
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      {index === 0 && <Home className="w-3 h-3" />}
                      <span>{item.label}</span>
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 dark:text-gray-600 text-gray-400 mx-1 flex-shrink-0" />}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
