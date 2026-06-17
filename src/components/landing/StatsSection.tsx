'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Eye, Package, DollarSign, TrendingUp } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

const stats = [
  {
    value: 1300,
    suffix: 'M',
    label: 'toneladas de comida desperdiciadas al año',
    source: 'FAO',
    icon: Package,
  },
  {
    value: 1,
    prefix: '$',
    suffix: 'B',
    label: 'en pérdidas económicas anuales',
    source: 'Banco Mundial',
    icon: DollarSign,
  },
  {
    value: 8,
    suffix: '%',
    label: 'de emisiones globales de CO₂',
    source: 'UNEP',
    icon: TrendingUp,
  },
]

export default function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">El problema es real</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">
            El mundo pierde comida a <span className="text-primary">escala masiva</span>
          </h2>
          <p className="dark:text-gray-500 text-gray-400 text-sm mt-2">
            Datos de la FAO, Banco Mundial y Naciones Unidas
          </p>
        </motion.div>

        <div ref={ref} className="grid md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative text-center p-6 rounded-2xl bg-gradient-to-br from-primary/[0.18] to-primary/[0.05] border border-white/10 hover:border-primary/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>

              <p className="text-4xl font-bold dark:text-white text-gray-900 group-hover:scale-105 transition-transform duration-300">
                {isInView ? (
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} duration={2000} />
                ) : (
                  <span>0{stat.suffix}</span>
                )}
              </p>
              <p className="dark:text-gray-300 text-gray-600 text-sm mt-2 font-medium">{stat.label}</p>
              <p className="dark:text-gray-500 text-gray-400 text-xs mt-2">{stat.source}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="dark:text-gray-500 text-gray-400 text-sm max-w-2xl mx-auto">
            Cada año, más de <span className="text-primary font-bold">1.300 millones de toneladas</span> de comida
            terminan en la basura.
            <span className="block mt-1">
              Paporla es parte de la solución. <span className="text-primary">¿Te sumas?</span>
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
