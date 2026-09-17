'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'

/**
 * CTA final de la portada.
 *
 * Antes era una isla oscura, y la portada tenia DOS: esta y la del
 * "como funciona" que vive dentro del hero. La regla de diseno de Paporla es
 * explicita con esto:
 *
 *     "Usalo UNA vez por pagina [...] Dos islas en la misma pagina dejan de
 *      ser un acento y se convierten en un patron. Una sola es una decision."
 *
 * Se queda la del "como funciona", por una razon de peso: esa esta ARRIBA, en
 * la misma pantalla que el titular. La prueba del skill es ensenar la portada
 * cinco segundos y preguntar que hace la empresa, y esos cinco segundos pasan
 * en la primera pantalla. Explicar el mecanismo (explora, reserva, recoge,
 * disfruta) gana a un boton final que nadie pulsa si antes no ha entendido de
 * que va esto.
 *
 * Y no se pierde fuerza: sobre la crema, un boton esmeralda solido ya es el
 * elemento de mayor contraste de la pagina. El neon no hace falta aqui; hace
 * falta donde no compite con nada.
 *
 * El texto no cambia ni una palabra: esto es solo aspecto.
 */
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
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-card-lg blur-xl opacity-0 group-hover:opacity-40 transition duration-500" />

          <div className="relative rounded-card-lg bg-white dark:bg-dark-card p-10 md:p-12 text-center border border-black/[0.06] dark:border-white/10 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              ¿Listo para <span className="text-primary">rescatar comida</span>?
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              Únete a la comunidad que ahorra mientras ayuda al planeta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/packs"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 text-center group"
              >
                Explorar packs ahora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/register?role=comercio"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-primary/40 text-gray-900 dark:text-white font-semibold hover:bg-primary/10 transition text-center"
              >
                Registra tu comercio
              </Link>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-dark-card text-gray-500 text-xs">O</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-gray-900 dark:text-white font-medium hover:bg-primary/20 transition-all duration-300 text-center"
              >
                <UserPlus className="w-4 h-4 text-primary" />
                Crear cuenta gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300 text-sm hover:opacity-80 transition-colors"
              >
                ¿Ya tienes cuenta? <span className="text-primary font-medium">Iniciar sesión</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 pt-5 border-t border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-gray-500">Ahorra hasta 70%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-500" />
                <span className="text-xs text-gray-500">Ayudas al planeta</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
