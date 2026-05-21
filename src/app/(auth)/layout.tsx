'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const titles: Record<string, { title: string; subtitle: string }> = {
    '/login': { title: 'Bienvenido de vuelta', subtitle: 'Inicia sesion para continuar' },
    '/register': { title: 'Crea tu cuenta', subtitle: 'Unete a la comunidad que rescata comida' },
    '/forgot-password': { title: 'Olvidaste tu contrasena?', subtitle: 'Te ayudamos a recuperarla' },
    '/reset-password': { title: 'Nueva contrasena', subtitle: 'Ingresa tu nueva contrasena' },
  }

  const current = titles[pathname] || titles['/login']

  return (
    <div className="min-h-screen dark:bg-black bg-gray-50 flex items-center justify-center py-20 px-4">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block group mb-6">
            <div className="relative w-full mx-auto">
              <Image
                src="/images/banner-optimized.webp"
                alt="Paporla - Rescate Alimentario"
                width={1200}
                height={800}
                className="w-full h-auto object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                priority
              />
            </div>
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-gradient">{current.title}</span>
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">{current.subtitle}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dark:bg-black/40 bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 dark:border-white/10 border-gray-200"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}