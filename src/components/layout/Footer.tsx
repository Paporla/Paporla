'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Mail, MapPin, Clock, Phone, ChevronUp, Shield, FileText, Cookie, Scale } from 'lucide-react'

const FOOTER_CONFIG = {
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? 'Santiago, Chile',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@paporla.com',
  hours: 'Lun - Vie: 9am - 6pm',
}

export default function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const legalLinks = [
    { href: '/legal/terminos', label: 'Terminos y Condiciones', icon: FileText },
    { href: '/legal/privacidad', label: 'Politica de Privacidad', icon: Shield },
    { href: '/legal/cookies', label: 'Politica de Cookies', icon: Cookie },
    { href: '/legal/legal-bases', label: 'Bases Legales', icon: Scale },
  ]

  const companyLinks = [
    { href: '/packs', label: 'Explorar packs' },
    { href: '/shops', label: 'Comercios aliados' },
    { href: '/about', label: 'Sobre nosotros' },
    { href: '/faq', label: 'Preguntas frecuentes' },
    { href: '/contacto', label: 'Contacto' },
  ]

  return (
    <>
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-black shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <ChevronUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      )}

      <footer className="relative bg-gradient-to-b from-transparent via-black/[0.04] to-black/[0.08] dark:via-black/20 dark:to-black/40 border-t border-black/5 dark:border-white/5">
        {/* Fondos decorativos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-12">
          {/* Columnas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo + slogan */}
            <div className="flex flex-col items-center md:items-start">
              <Link href="/" className="flex items-center gap-2 group mb-3">
                <Image
                  src="/images/logo-transparent.png"
                  alt="Paporla"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <span className="font-bold text-xl text-gray-900 dark:text-white">Paporla</span>
              </Link>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed text-center md:text-left">
                Rescatando comida,
                <br />
                alimentando esperanzas.
              </p>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2 justify-center md:justify-start">
                <Shield className="w-4 h-4 text-primary" />
                Legal
              </h3>
              <ul className="space-y-2 text-center md:text-left">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 text-sm hover:text-primary transition-colors flex items-center gap-2 justify-center md:justify-start group"
                    >
                      <link.icon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compañía */}
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 text-primary" />
                Compania
              </h3>
              <ul className="space-y-2 text-center md:text-left">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 text-sm hover:text-primary transition-colors hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4 flex items-center gap-2 justify-center md:justify-start">
                <Heart className="w-4 h-4 text-primary" />
                Contacto
              </h3>
              <ul className="space-y-3 text-center md:text-left">
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm justify-center md:justify-start">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{FOOTER_CONFIG.address}</span>
                </li>
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm justify-center md:justify-start">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={`mailto:${FOOTER_CONFIG.email}`} className="hover:text-primary transition-colors">
                    {FOOTER_CONFIG.email}
                  </a>
                </li>
                {FOOTER_CONFIG.phone && (
                  <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm justify-center md:justify-start">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{FOOTER_CONFIG.phone}</span>
                  </li>
                )}
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm justify-center md:justify-start">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{FOOTER_CONFIG.hours}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="border-t border-white/10 my-6" />

          {/* Línea final — copyright + corazón */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <p>&copy; {currentYear} Paporla. Todos los derechos reservados.</p>
            <motion.p whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
              Hecho con
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Heart className="w-3 h-3 text-primary fill-primary" />
              </motion.span>
              para reducir el desperdicio alimentario
            </motion.p>
          </div>
        </div>
      </footer>
    </>
  )
}
