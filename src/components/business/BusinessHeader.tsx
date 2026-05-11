'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Store, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface BusinessHeaderProps {
  shop: {
    name: string;
    verified: boolean;
    logo_url: string | null;
  };
}

export default function BusinessHeader({ shop }: BusinessHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          {shop.logo_url ? (
            <Image src={shop.logo_url} alt={shop.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {shop.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {shop.verified ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verificado
                </span>
              ) : (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Pendiente de verificación
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-gray-400 mt-2">
          Gestiona tus packs y reservas desde aquí
        </p>
      </div>
    </div>
  );
}