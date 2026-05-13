'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, Package, ShoppingBag, Store, Award } from 'lucide-react';

interface UserWelcomeBannerProps {
  userName: string;
  packsRescued?: number;
  level?: string;
  points?: number;
}

export default function UserWelcomeBanner({
  userName,
  packsRescued = 0,
  level = 'Aprendiz',
  points = 0,
}: UserWelcomeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              Panel de Control
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            ¡Hola, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Has rescatado <span className="text-primary font-bold">{packsRescued}</span> packs. 
            ¡Sigue salvando comida! 🌱
          </p>
          
          {/* Enlaces rápidos a explorar */}
          <div className="flex gap-3 mt-4">
            <Link
              href="/packs"
              className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Explorar packs
            </Link>
            <span className="text-gray-600">•</span>
            <Link
              href="/shops"
              className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Ver comercios
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{packsRescued}</p>
              <p className="text-[10px] text-gray-500">Packs salvados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{level}</p>
              <p className="text-[10px] text-gray-500">{points} pts</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}