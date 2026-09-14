'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Sparkles,
  Store,
  ShoppingBag,
  CreditCard,
  Shield,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Star,
  Heart,
  Mail,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface FaqItem {
  question: string
  answer: string
  icon: React.ElementType
  category: 'general' | 'client' | 'business'
}

/**
 * L-45 (auditoría externa A-02, A-08, A-20, A-54, A-74): esta página prometía cosas que no
 * existen. Regla adoptada: ningún texto de la interfaz puede prometer algo que la app no haga hoy.
 * Cambios concretos y su porqué:
 *  - El código de recogida NO es "de 6 dígitos": es `P4P-XXXXXXXX` (migración 0031, línea 82).
 *  - NO hay comisión que "se descuente automáticamente": los pagos están bloqueados hasta tener
 *    empresa + MercadoPago (decisión del fundador). Se dice explícitamente.
 *  - NO hay "billetera virtual" ni "retiros a tu cuenta bancaria": el modelo decidido es la
 *    liquidación mensual simple (L-12, 2026-09-10), y aún no está implementado. Se dice.
 *  - La verificación de comercios SÍ es real y SÍ es obligatoria para publicar: `publish_pack`
 *    exige `shops.status = 'verified'` (0009:1601 y 0037:382) y `search_available_packs` solo
 *    devuelve packs de comercios verificados (0037:180). Lo que NO existe es un plazo: la revisión
 *    es manual, así que se quita cualquier promesa de horas (A-54).
 *  - Se retira el botón "Chat en vivo", que no tenía manejador (A-74). No se sustituye por otra
 *    promesa: queda el enlace a /contacto.
 *  - La ventana de cancelación "2 horas antes" SÍ es cierta: `markets.cancellation_cutoff_minutes`
 *    = 120 para Chile (0015) y `cancel_reservation` la aplica (0016:70). Se mantiene.
 */
const faqs: FaqItem[] = [
  {
    question: '¿Qué es Paporla?',
    answer:
      'Paporla es una plataforma de rescate alimentario que conecta comercios con excedentes de comida con personas que buscan alimentos a precio reducido. Ayudamos a reducir el desperdicio alimentario mientras ahorras dinero.',
    icon: HelpCircle,
    category: 'general',
  },
  {
    question: '¿Cómo funciona el rescate alimentario?',
    answer:
      'Los comercios publican packs sorpresa con alimentos que no vendieron durante el día a un precio reducido. Los usuarios reservan estos packs, los recogen en la franja horaria acordada y ayudan a reducir el desperdicio alimentario.',
    icon: Sparkles,
    category: 'general',
  },
  {
    question: '¿Cómo me registro como usuario?',
    answer:
      'Solo necesitas un correo electrónico y una contraseña. Puedes registrarte como "Usuario" para empezar a reservar packs. El proceso es gratuito y rápido.',
    icon: ShoppingBag,
    category: 'client',
  },
  {
    question: '¿Puedo cancelar una reserva?',
    answer:
      'Sí, puedes cancelar tu reserva gratis desde Mis Reservas hasta 2 horas antes de que empiece la ventana de retiro. Pasado ese momento ya no se puede cancelar, para que el comercio pueda preparar tu pack con seguridad.',
    icon: Clock,
    category: 'client',
  },
  {
    question: '¿Cómo recibo mi pedido?',
    answer:
      'Todas las recogidas son en el local del comercio. Al hacer la reserva recibirás un código de recogida con el formato P4P-XXXXXXXX, que deberás presentar al llegar. Verifica la dirección y la franja horaria de recogida en el detalle del pack.',
    icon: MapPin,
    category: 'client',
  },
  {
    question: '¿Cómo me registro como comercio?',
    answer:
      'Al registrarte, selecciona la opción "Comercio" y completa los datos de tu negocio. Tu comercio queda en borrador hasta que nuestro equipo lo revisa y lo verifica: sin verificación no se pueden publicar packs. La revisión es manual y la hacemos nosotros, así que no tenemos un plazo automático que prometerte.',
    icon: Store,
    category: 'business',
  },
  {
    question: '¿Cuánto cuesta publicar packs?',
    answer:
      'Publicar packs en Paporla es gratis. Hoy no cobramos ninguna comisión: los pagos dentro de la plataforma todavía no están activos. Cuando los activemos, lo anunciaremos con las condiciones por escrito antes de aplicarlas, y ningún comercio verá un cobro que no haya aceptado.',
    icon: CreditCard,
    category: 'business',
  },
  {
    question: '¿Cómo funciona el pago de las ventas?',
    answer:
      'Ahora mismo no se cobra ni se paga nada a través de Paporla, porque los pagos aún no están activos. Lo que muestra el panel del comercio es un registro informativo de las ventas. El modelo que tenemos decidido para cuando se activen es una liquidación mensual por transferencia bancaria: no habrá billetera virtual ni retiros dentro de la aplicación.',
    icon: Shield,
    category: 'business',
  },
  {
    question: '¿Los comercios son verificados?',
    answer:
      'Sí. Un comercio puede registrarse y dejar sus packs preparados, pero no puede publicarlos hasta que nuestro equipo lo verifica, y en el catálogo solo aparecen packs de comercios verificados. La revisión es manual: no tenemos un plazo automático, así que si tu comercio lleva tiempo en revisión, escríbenos.',
    icon: Star,
    category: 'general',
  },
  {
    question: '¿Qué beneficios tiene Paporla para el medio ambiente?',
    answer:
      'Cada pack que compras ayuda a evitar que alimentos perfectamente buenos terminen en la basura. Reducir el desperdicio alimentario disminuye las emisiones de CO₂ y ahorra agua y recursos.',
    icon: Heart,
    category: 'general',
  },
]

const categoryTabs = [
  { id: 'all', label: 'Todas', color: 'text-primary' },
  { id: 'general', label: 'Generales', color: 'text-secondary' },
  { id: 'client', label: 'Para Clientes', color: 'text-green-400' },
  { id: 'business', label: 'Para Comercios', color: 'text-secondary' },
]

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const filteredFaqs = activeCategory === 'all' ? faqs : faqs.filter((faq) => faq.category === activeCategory)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Preguntas Frecuentes</h1>
            <p className="dark:text-gray-400 text-gray-600 text-lg max-w-2xl mx-auto">
              Encuentra respuestas a las dudas mas comunes sobre Paporla
            </p>
          </motion.div>
        </div>
      </div>

      {/* Categorías */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === tab.id
                  ? `bg-primary/20 text-primary border border-primary/50 shadow-lg shadow-primary/20`
                  : 'dark:bg-gray-800/50 bg-gray-100 dark:text-gray-400 text-gray-600 hover:dark:bg-gray-800 hover:bg-gray-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {filteredFaqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                glass
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'border-primary/30' : ''
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg bg-primary/10 transition-colors duration-300 ${
                        openIndex === index ? 'bg-primary/20' : ''
                      }`}
                    >
                      <faq.icon
                        className={`w-5 h-5 ${
                          openIndex === index ? 'text-primary' : 'dark:text-gray-400 text-gray-600'
                        }`}
                      />
                    </div>
                    <span className="font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                      {faq.question}
                    </span>
                  </div>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors" />
                  )}
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-5 pb-5 pt-2 border-t dark:border-gray-800/50 border-gray-200">
                        <p className="dark:text-gray-400 text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contacto adicional */}
        <div className="max-w-3xl mx-auto mt-12">
          <Card glass className="p-6 text-center">
            <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-2">
              No encontraste lo que buscabas?
            </h3>
            <p className="dark:text-gray-400 text-gray-600 text-sm mb-4">Escríbenos y te ayudaremos con tu consulta</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contacto">
                <Button variant="outline" icon={<Mail className="w-4 h-4" />}>
                  Escríbenos
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
