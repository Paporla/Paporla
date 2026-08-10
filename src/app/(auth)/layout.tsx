'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const titles: Record<string, { title: string; subtitle: string }> = {
    '/login': { title: 'Bienvenido de vuelta', subtitle: 'Inicia sesión para continuar rescatando comida' },
    '/register': { title: 'Crea tu cuenta', subtitle: 'Únete a la comunidad que rescata comida' },
    '/forgot-password': {
      title: 'Recupera tu acceso',
      subtitle: 'Te enviamos un enlace para restablecer tu contraseña',
    },
    '/reset-password': { title: 'Nueva contraseña', subtitle: 'Elige una contraseña segura para tu cuenta' },
  }

  const current = titles[pathname] || titles['/login']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 md:py-12 px-4 relative">
      {/* Blobs decorativos — mismo estilo que la landing */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />

        {/* Partículas flotantes */}
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

      {/* Link volver al inicio */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-20 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/5"
      >
        <ArrowLeft className="w-3 h-3" />
        Volver al inicio
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Banner con Luna animada + imagen centrada */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <Link href="/" className="relative w-36 h-36 group">
            <div className="absolute -inset-3 bg-primary/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="moon-banner absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Image
                src="/images/banner-optimized.webp"
                alt="Paporla - Rescate Alimentario"
                width={120}
                height={120}
                className="w-24 h-24 rounded-full object-cover shadow-2xl shadow-black/50 border-2 border-white/10 group-hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>
          </Link>
        </motion.div>

        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            <span className="text-gradient">{current.title}</span>
          </h1>
          <p className="text-gray-400 text-sm">{current.subtitle}</p>
        </motion.div>

        {/* Card contenedora */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-2xl p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-primary/[0.18] to-primary/[0.05] border border-primary/20 backdrop-blur-sm"
        >
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          {children}
        </motion.div>

        {/* Footer sutil */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6 text-xs text-gray-600"
        >
          Paporla — Rescatando comida, alimentando esperanzas
        </motion.p>
      </div>
    </div>
  )
}
