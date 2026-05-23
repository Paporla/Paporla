'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t dark:border-white/10 border-gray-200 py-8 md:py-10 mt-8 md:mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm dark:text-gray-500 text-gray-400">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo-transparent.png"
              alt="Paporla"
              width={20}
              height={20}
              className="w-5 h-5 object-contain"
            />
            <span>Paporla - Rescatando comida, alimentando esperanzas</span>
          </div>
          <div className="flex gap-6 md:gap-8">
            <Link href="/legal/terminos" className="hover:text-primary transition-colors">
              Terminos
            </Link>
            <Link href="/legal/privacidad" className="hover:text-primary transition-colors">
              Privacidad
            </Link>
            <Link href="/legal/cookies" className="hover:text-primary transition-colors">
              Cookies
            </Link>
            <Link href="/legal/legal-bases" className="hover:text-primary transition-colors">
              Bases Legales
            </Link>
            <Link href="/contacto" className="hover:text-primary transition-colors">
              Contacto
            </Link>
          </div>
          <motion.p whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
            &copy; {currentYear} Paporla - Hecho con <Heart className="w-3 h-3 text-primary inline" /> para el planeta
          </motion.p>
        </div>
      </div>
    </footer>
  )
}
