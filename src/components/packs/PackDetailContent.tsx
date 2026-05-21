'use client';

import { CheckCircle, Leaf } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatPrice';

interface PackDetailContentProps {
  title: string;
  description: string | null;
  items?: string[] | null;
  priceCents: number;
  originalPriceCents: number | null;
  endsAt: string | null;
}

export default function PackDetailContent({
  title,
  description,
  items,
  priceCents,
  originalPriceCents,
  endsAt,
}: PackDetailContentProps) {
  const savings = originalPriceCents
    ? ((originalPriceCents - priceCents) / 100).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      {/* Titulo y descripcion */}
      <div>
        <h1 className="text-xl font-black dark:text-white text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Ahorro */}
      {savings && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs dark:text-gray-500 text-gray-400">Tu ahorro</p>
              <p className="text-lg font-bold text-green-400">${savings}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs dark:text-gray-500 text-gray-400">Precio pack</p>
            <p className="text-xl font-black text-primary">{formatPrice(priceCents)}</p>
          </div>
        </div>
      )}

      {/* Items incluidos */}
      {items && items.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold dark:text-white text-gray-900">Que incluye?</h3>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 dark:bg-dark-muted bg-gray-100 rounded-xl px-3 py-2.5">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs dark:text-gray-300 text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valido hasta */}
      {endsAt && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-xs text-yellow-400">
            Valido hasta: {new Date(endsAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
