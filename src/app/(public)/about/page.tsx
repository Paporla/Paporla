'use client'

import { motion } from 'framer-motion'
import { 
  Heart, Globe, Users, Leaf, Target, Award, 
  Clock, MapPin, ShoppingBag, Store, CheckCircle,
  ArrowRight, Shield, TrendingUp
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pt-20 pb-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-4">
              Sobre Paporla
            </h1>
            <p className="dark:text-gray-400 text-gray-600 text-lg max-w-2xl mx-auto">
              Transformando el desperdicio alimentario en oportunidades para todos
            </p>
          </motion.div>
        </div>
      </div>

      {/* Misión */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card glass className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Target className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-4">Nuestra Mision</h2>
              <p className="dark:text-gray-400 text-gray-600 leading-relaxed">
                En Paporla, nuestra misión es reducir el desperdicio alimentario 
                conectando comercios con excedentes de comida. 
                Creemos que ningún alimento debería terminar en la basura.
              </p>
            </Card>
          </motion.div>

          {/* Visión */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-8"
          >
            <Card glass className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-4">Nuestra Vision</h2>
              <p className="dark:text-gray-400 text-gray-600 leading-relaxed">
                Aspiramos a ser la plataforma líder de rescate alimentario en Latinoamérica, 
                creando un ecosistema donde comercios, consumidores y comunidades trabajen 
                juntos para eliminar el desperdicio de alimentos.
              </p>
            </Card>
          </motion.div>

          {/* Valores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-bold dark:text-white text-gray-900 text-center mb-8">Nuestros Valores</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Leaf, title: 'Sostenibilidad', desc: 'Comprometidos con el medio ambiente reduciendo el desperdicio', color: 'text-green-400', bgColor: 'bg-green-400/10' },
                { icon: Users, title: 'Comunidad', desc: 'Fortaleciendo lazos entre comercios y vecinos', color: 'text-primary', bgColor: 'bg-primary/10' },
                { icon: Shield, title: 'Transparencia', desc: 'Procesos claros y comunicación abierta', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
                { icon: TrendingUp, title: 'Innovación', desc: 'Buscamos constantemente mejorar la experiencia', color: 'text-secondary', bgColor: 'bg-secondary/10' },
                { icon: Heart, title: 'Empatía', desc: 'Entendemos las necesidades de todos los usuarios', color: 'text-red-400', bgColor: 'bg-red-400/10' },
                { icon: Award, title: 'Calidad', desc: 'Garantizamos comercios verificados y alimentos seguros', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
              ].map((value, i) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover className="p-5 text-center h-full">
                    <div className={`p-3 ${value.bgColor} rounded-xl inline-flex mb-3`}>
                      <value.icon className={`w-6 h-6 ${value.color}`} />
                    </div>
                    <h3 className="font-semibold dark:text-white text-gray-900 mb-2">{value.title}</h3>
                    <p className="dark:text-gray-400 text-gray-600 text-sm">{value.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Impacto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16"
          >
            <div className="glass-card rounded-2xl p-8">
              <h2 className="text-2xl font-bold dark:text-white text-gray-900 text-center mb-8">Nuestro Impacto</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">50+</div>
                  <div className="text-xs dark:text-gray-400 text-gray-600 mt-1">Comercios aliados</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">1,200+</div>
                  <div className="text-xs dark:text-gray-400 text-gray-600 mt-1">Packs vendidos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">2,500kg</div>
                  <div className="text-xs dark:text-gray-400 text-gray-600 mt-1">Comida rescatada</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">800+</div>
                  <div className="text-xs dark:text-gray-400 text-gray-600 mt-1">Usuarios activos</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <div className="relative overflow-hidden rounded-2xl p-8">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
              <div className="absolute inset-0 backdrop-blur-sm" />
              <div className="relative">
                <h3 className="text-2xl font-bold dark:text-white text-gray-900 mb-3">
                  Quieres ser parte del cambio?
                </h3>
                <p className="dark:text-gray-300 text-gray-700 mb-6 max-w-md mx-auto">
                  Únete a Paporla y comienza a rescatar comida hoy mismo
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/register">
                    <Button variant="primary" size="lg" icon={<ShoppingBag className="w-4 h-4" />}>
                      Registrarse como usuario
                    </Button>
                  </Link>
                  <Link href="/register?role=comercio">
                    <Button variant="outline" size="lg" icon={<Store className="w-4 h-4" />}>
                      Registrar mi comercio
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}