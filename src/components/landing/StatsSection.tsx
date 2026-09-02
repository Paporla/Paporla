'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Package, DollarSign, Store, Leaf } from 'lucide-react'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/utils/api-client'
import { formatChilePesos } from '@/lib/utils/formatPrice'
import type { CommunityStats } from '@/app/api/stats/route'

/*
 * Los datos reales de la comunidad solo se muestran con al menos este
 * número de comercios verificados: con 1 comercio y 4 packs la cifra
 * real transmite lo contrario de lo que debe ("aquí no hay nadie").
 * Hasta entonces, la sección cuenta el PROBLEMA con datos de la FAO,
 * Banco Mundial y ONU, que son verdad siempre. Decidido por el fundador
 * el 2026-09-02.
 */
const MIN_VERIFIED_SHOPS_FOR_REAL_STATS = 10

// Fallback: datos de la FAO si la API no responde o la comunidad es pequeña
const fallbackStats = [
  {
    value: 1300,
    suffix: 'M',
    label: 'toneladas de comida desperdiciadas al año',
    source: 'FAO',
    icon: Package,
    isMoney: false,
  },
  {
    value: 1,
    prefix: '$',
    suffix: 'B',
    label: 'en pérdidas económicas anuales',
    source: 'Banco Mundial',
    icon: DollarSign,
    isMoney: false,
  },
  { value: 8, suffix: '%', label: 'de emisiones globales de CO₂', source: 'UNEP', icon: Leaf, isMoney: false },
]

export default function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const { data: apiStats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      try {
        const result = await apiFetch<{ success: boolean; stats: CommunityStats }>('/api/stats')
        return result.stats
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min de caché
    retry: 1,
  })

  // Datos reales solo cuando la comunidad ya se ve como comunidad;
  // si no, el fallback (el problema global, siempre cierto).
  const hasRealStats =
    !!apiStats && apiStats.activeShops >= MIN_VERIFIED_SHOPS_FOR_REAL_STATS && apiStats.packsRescued > 0

  const communityStats = hasRealStats
    ? [
        {
          value: apiStats.packsRescued,
          suffix: '',
          label: 'packs rescatados por la comunidad',
          source: 'En tiempo real',
          icon: Package,
          isMoney: false,
        },
        {
          value: apiStats.moneySavedMinor,
          suffix: '',
          label: 'ahorrados por la comunidad',
          source: 'En tiempo real',
          icon: DollarSign,
          isMoney: true,
        },
        {
          value: apiStats.activeShops,
          suffix: '',
          label: 'comercios verificados activos',
          source: 'En tiempo real',
          icon: Store,
          isMoney: false,
        },
      ]
    : fallbackStats

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {hasRealStats ? (
              <>
                La comunidad ya está <span className="text-primary">marcando la diferencia</span>
              </>
            ) : (
              <>
                El mundo pierde comida a <span className="text-primary">escala masiva</span>
              </>
            )}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {hasRealStats ? 'Datos en tiempo real de Paporla' : 'Datos de la FAO, Banco Mundial y Naciones Unidas'}
          </p>
        </motion.div>

        <div ref={ref} className="grid md:grid-cols-3 gap-6">
          {communityStats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative text-center p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-primary/[0.18] dark:to-primary/[0.05] border border-black/[0.06] dark:border-white/10 shadow-sm dark:shadow-none hover:border-primary/30 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>

              {isInView ? (
                <p className="text-4xl font-bold text-gradient dark:text-white group-hover:scale-105 transition-transform duration-300">
                  {stat.isMoney ? (
                    formatChilePesos(stat.value)
                  ) : (
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      prefix={stat.prefix ?? ''}
                      duration={2000}
                    />
                  )}
                </p>
              ) : (
                <p className="text-4xl font-bold text-gradient dark:text-white">
                  {stat.prefix ?? ''}0{stat.suffix}
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 font-medium">{stat.label}</p>
              <p className="text-gray-500 text-xs mt-2">{stat.source}</p>
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
          {hasRealStats ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-2xl mx-auto">
              <span className="text-primary font-bold">{apiStats.packsRescued} packs</span> rescatados ·{' '}
              <span className="text-primary font-bold">{formatChilePesos(apiStats.moneySavedMinor)}</span> ahorrados ·{' '}
              <span className="text-primary font-bold">{apiStats.co2SavedKg.toLocaleString()} kg</span> de CO₂ evitados
              <span className="block mt-2 text-primary font-semibold">¿Te sumas?</span>
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-2xl mx-auto">
              Sé parte del cambio.{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Regístrate gratis
              </Link>{' '}
              y empieza a rescatar comida hoy.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  )
}
