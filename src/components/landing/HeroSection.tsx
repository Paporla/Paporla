'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import HowItWorksSection from './HowItWorksSection';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-12 pb-20 overflow-hidden">
      {/* Fondo animado sutil */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Columna Izquierda */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">✨ Lanzando en Caracas · 2026 ✨</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Comida de calidad.
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Sin desperdiciar.
              </span>
              <br />
              Sin pagar de más.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg max-w-md mb-8 leading-relaxed"
            >
              Paporla conecta comercios con excedentes del día y personas como tú. 
              Reserva, recoge y disfruta mientras ayudas al planeta.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              <Link 
                href="/packs" 
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-black font-semibold transition-all shadow-lg shadow-primary/30 hover:shadow-xl text-center"
              >
                <span className="relative z-10">Ver packs cerca de mí</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition" />
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </Link>
              <Link 
                href="/shops" 
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-primary/40 text-white font-semibold hover:bg-primary/10 transition text-center"
              >
                Soy comercio
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-start gap-8 pt-4 border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                <span className="text-sm text-gray-300">Comercios verificados</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-primary" />
                <span className="text-sm text-gray-300">Reserva inmediata</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Columna Derecha - How it works (ahora como componente separado) */}
          <HowItWorksSection />
        </div>
      </div>
    </section>
  );
}