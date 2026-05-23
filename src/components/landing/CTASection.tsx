'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, UserPlus } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-24">
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

          <div className="relative dark:bg-gradient-to-br dark:from-primary/10 dark:to-primary/5 bg-primary/5 rounded-2xl p-10 md:p-12 text-center border border-primary/20 backdrop-blur-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-bold dark:text-white text-gray-900 mb-3">
              Listo para <span className="text-primary">rescatar comida</span>?
            </h2>

            <p className="dark:text-gray-400 text-gray-600 mb-6 max-w-md mx-auto">
              Unete a miles de personas que ya estan ahorrando mientras ayudan al planeta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/packs"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 transition shadow-md text-center group"
              >
                Explorar packs ahora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/shops"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-primary/40 dark:text-white text-gray-900 font-semibold hover:bg-primary/10 transition text-center"
              >
                Soy comercio
              </Link>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t dark:border-white/10 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent dark:text-gray-500 text-gray-400 text-xs">O</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-300 dark:text-white text-gray-900 font-medium hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
              >
                <UserPlus className="w-4 h-4 text-primary" />
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1 dark:text-gray-400 text-gray-500 text-sm hover:text-primary transition-colors"
              >
                Ya tienes cuenta? <span className="text-primary">Iniciar sesion</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 pt-5 border-t dark:border-white/10 border-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs dark:text-gray-500 text-gray-400">Ahorra hasta 70%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-500" />
                <span className="text-xs dark:text-gray-500 text-gray-400">Ayudas al planeta</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
