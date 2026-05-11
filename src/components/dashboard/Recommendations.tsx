'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'

const recommendations = [
  { icon: '🍕', title: 'Packs de pizza', description: 'Hasta 50% descuento', link: '/packs' },
  { icon: '🍣', title: 'Comida asiática', description: 'Packs sorpresa', link: '/packs' },
  { icon: '🥗', title: 'Opciones saludables', description: 'Nuevos comercios', link: '/shops' },
]

export default function Recommendations() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Recomendaciones para ti
        </h2>
        <Link href="/packs" className="text-xs text-primary hover:underline">
          Ver todos →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, index) => (
          <Link href={rec.link} key={index}>
            <Card glass hover className="p-4 cursor-pointer transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{rec.icon}</span>
                <div>
                  <h3 className="font-semibold text-white">{rec.title}</h3>
                  <p className="text-xs text-gray-400">{rec.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}