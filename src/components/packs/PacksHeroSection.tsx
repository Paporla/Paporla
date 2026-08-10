'use client'

import { motion } from 'framer-motion'

interface Props {
  count: number
}

export default function PacksHeroSection({ count }: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            <span className="text-gradient">Packs Disponibles</span>
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-lg max-w-2xl mx-auto">
            Descubre comida deliciosa a precios increibles mientras ayudas a reducir el desperdicio alimentario.
          </p>
          <div className="mt-4 text-sm dark:text-gray-500 text-gray-400">
            <span className="text-primary font-semibold">{count}</span> packs disponibles para rescatar
          </div>
        </motion.div>
      </div>
    </div>
  )
}
