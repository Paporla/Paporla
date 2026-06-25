'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const titles: Record<string, { title: string; subtitle: string }> = {
    '/login': { title: 'Bienvenido de vuelta', subtitle: 'Inicia sesión para continuar rescatando comida' },
    '/register': { title: 'Crea tu cuenta', subtitle: 'Únete a la comunidad que rescata comida' },
    '/forgot-password': { title: '¿Olvidaste tu contraseña?', subtitle: 'Te ayudamos a recuperarla' },
    '/reset-password': { title: 'Nueva contraseña', subtitle: 'Elige una contraseña segura' },
  }

  const current = titles[pathname] || titles['/login']

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 md:py-20 px-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 20% 30%, #0a0a1a, #020205)',
      }}
    >
      {/* Capa light mode */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-transparent" />

      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Textura de ruido — idéntica a la landing */}
        <div
          className="absolute inset-0 dark:opacity-30 opacity-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            pointerEvents: 'none',
          }}
        />

        {/* Blobs animados — igual que la landing */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />

        {/* Partículas flotantes sutiles (solo dark) */}
        <div className="hidden dark:block">
          <div
            className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/40 rounded-full animate-ping"
            style={{ animationDuration: '3s' }}
          />
          <div
            className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-primary/30 rounded-full animate-ping"
            style={{ animationDuration: '4s', animationDelay: '1s' }}
          />
          <div
            className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-primary/20 rounded-full animate-ping"
            style={{ animationDuration: '5s', animationDelay: '2s' }}
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header con logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block group mb-6">
            <div className="relative w-48 md:w-56 mx-auto">
              {/* Glow detrás del logo */}
              <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <Image
                  src="/images/banner-optimized.webp"
                  alt="Paporla - Rescate Alimentario"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover rounded-xl group-hover:scale-[1.02] transition-transform duration-300 shadow-lg dark:shadow-black/50 shadow-gray-300/50"
                  priority
                />
                {/* Borde glow al hover */}
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 opacity-0 group-hover:opacity-100 group-hover:ring-primary/20 transition-all duration-300 pointer-events-none" />
              </div>
            </div>
          </Link>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-gradient">{current.title}</span>
            </h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">{current.subtitle}</p>
          </motion.div>
        </motion.div>

        {/* Card contenedora */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden"
        >
          {/* Brillo superior sutil */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          {children}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6 text-xs dark:text-gray-600 text-gray-400"
        >
          Paporla — Rescatando comida, alimentando esperanzas
        </motion.p>
      </div>
    </div>
  )
}
