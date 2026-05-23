'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Shield, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function PoliticasRetiroPage() {
  return (
    <div className="min-h-screen dark:bg-black bg-gray-50 py-20 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href="/packs"
            className="inline-flex items-center gap-2 dark:text-gray-400 text-gray-600 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a packs
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Políticas de Retiro y Cancelación</span>
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-lg mb-8">
            Estas políticas aplican a todas las reservas realizadas en Paporla
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Política de retiro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="dark:bg-black/40 bg-white backdrop-blur-sm rounded-2xl p-6 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Horario de Recogida</h2>
            </div>
            <ul className="space-y-3 dark:text-gray-400 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>El usuario debe retirar su pedido dentro del horario establecido en la reserva.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  La hora límite de recogida se muestra claramente en el detalle de cada pack y en la confirmación de la
                  reserva.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>
                  Si no retiras tu pedido dentro del horario establecido, la reserva caducará automáticamente y se
                  marcará como <strong>&quot;No retirado&quot;</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>
                  Los packs no retirados no serán reembolsados, ya que son productos de rescate alimentario con
                  disponibilidad limitada.
                </span>
              </li>
            </ul>
          </motion.div>

          {/* Política de cancelación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="dark:bg-black/40 bg-white backdrop-blur-sm rounded-2xl p-6 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Cancelacion</h2>
            </div>
            <ul className="space-y-3 dark:text-gray-400 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Puedes cancelar tu reserva en cualquier momento desde tu panel de{' '}
                  <Link href="/dashboard" className="text-primary hover:underline">
                    Mis Reservas
                  </Link>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>La cancelación libera el stock para que otro usuario pueda reservar el pack.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>Cancelaciones frecuentes pueden resultar en restricciones temporales de la cuenta.</span>
              </li>
            </ul>
          </motion.div>

          {/* Código de recogida */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="dark:bg-black/40 bg-white backdrop-blur-sm rounded-2xl p-6 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Codigo de Recogida</h2>
            </div>
            <ul className="space-y-3 dark:text-gray-400 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Al confirmar la reserva recibirás un <strong>código único</strong> que deberás presentar al comercio.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  El código puedes encontrarlo en tu panel de{' '}
                  <Link href="/dashboard" className="text-primary hover:underline">
                    Mis Reservas
                  </Link>{' '}
                  y en el email de confirmación.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>No compartas tu código de recogida. Cada código es único y vinculado a tu cuenta.</span>
              </li>
            </ul>
          </motion.div>

          {/* Contacto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="dark:bg-black/40 bg-white backdrop-blur-sm rounded-2xl p-6 dark:border-white/10 border-gray-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold dark:text-white text-gray-900">Problemas?</h2>
            </div>
            <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">
              Si tienes algun problema con tu reserva, contactanos a traves de nuestro formulario de contacto.
            </p>
            <Link href="/contacto">
              <Button variant="outline" size="sm">
                Contactar soporte
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/packs" className="text-primary hover:underline text-sm">
            ← Volver a explorar packs
          </Link>
        </div>
      </div>
    </div>
  )
}
