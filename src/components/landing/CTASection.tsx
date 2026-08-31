'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-14">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition duration-500" />

          <div className="relative island-dark rounded-2xl p-10 md:p-12 text-center border border-white/10 dark:border-primary/20 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Listo para <span className="island-accent">rescatar comida</span>?
            </h2>

            <p className="island-muted mb-6 max-w-md mx-auto">
              Unete a miles de personas que ya estan ahorrando mientras ayudan al planeta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/packs"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-island-accent text-black font-semibold hover:opacity-90 transition shadow-md text-center group"
              >
                Explorar packs ahora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/25 dark:border-primary/40 text-white font-semibold hover:bg-white/10 dark:hover:bg-primary/10 transition text-center"
              >
                Registra tu comercio
              </Link>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent island-muted text-xs">O</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/10 dark:bg-primary/10 border border-white/20 dark:border-primary/30 text-white font-medium hover:bg-white/20 dark:hover:bg-primary/20 transition-all duration-300 shadow-lg shadow-black/10 dark:shadow-primary/10"
              >
                <UserPlus className="w-4 h-4 island-accent" />
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1 island-muted text-sm hover:opacity-80 transition-colors"
              >
                ¿Ya tienes cuenta? <span className="island-accent">Iniciar sesión</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 pt-5 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-island-accent animate-pulse" />
                <span className="text-xs island-muted">Ahorra hasta 70%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-island-accent animate-pulse delay-500" />
                <span className="text-xs island-muted">Ayudas al planeta</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
