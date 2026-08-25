'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, ArrowRight } from 'lucide-react'

/**
 * Banner del dashboard para perfiles SIN mercado (user_profiles.market_id
 * NULL). El registro (trigger de 0010) lo deja en NULL y
 * create_payment_reservation (0009:285) rechaza cualquier reserva con
 * MARKET_MISMATCH: sin este aviso, el usuario descubre el bloqueo al
 * intentar reservar, no antes.
 *
 * No se puede cerrar a propósito: es un bloqueo funcional, no un aviso
 * opcional (F2b). Desaparece solo cuando el perfil tiene mercado.
 * El selector real vive en /profile (MarketSelect); aquí solo se enlaza.
 * La red de seguridad para quien llegue igual por el catálogo sigue siendo
 * el ReserveModal (isMarketMismatchMessage).
 */
export default function MarketSelectionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold dark:text-white text-gray-900">Para reservar packs, elige tu mercado</h2>
          <p className="text-xs dark:text-gray-400 text-gray-600 mt-0.5">
            Tu perfil todavía no tiene mercado. Elige el país donde buscas y recoges packs y podrás reservar al
            instante.
          </p>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          Elegir mi mercado
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  )
}
