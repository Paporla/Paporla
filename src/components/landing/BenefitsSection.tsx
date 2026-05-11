'use client';

import { motion } from 'framer-motion';
import { MapPin, Clock, Gift, Shield, DollarSign, Heart } from 'lucide-react';

const benefits = [
  { icon: DollarSign, title: 'Ahorro', description: 'Hasta 70% de descuento en comida de calidad' },
  { icon: MapPin, title: 'Cercanía', description: 'Recogida local. Apoyas a comercios de tu ciudad' },
  { icon: Clock, title: 'Horarios flexibles', description: 'Recoge cuando puedas, sin prisas' },
  { icon: Gift, title: 'Sorpresa', description: 'Varía cada día. Nunca es aburrido' },
  { icon: Shield, title: 'Transparencia', description: 'Promesas claras. Sin letra chica' },
  { icon: Heart, title: 'Rescate', description: 'Comida que iba a la basura ahora se salva' },
];

export default function BenefitsSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            ¿Por qué elegir <span className="text-primary">Paporla</span>?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Beneficios para todos los que forman parte de nuestra comunidad
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              className="group relative text-center p-6 rounded-2xl bg-gradient-to-br from-gray-900/50 to-gray-950/50 border border-white/10 hover:border-primary/30 transition-all duration-300"
            >
              {/* Efecto glossy (como el CTA) */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative w-14 h-14 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                <benefit.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary transition-colors duration-300">
                {benefit.title}
              </h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}