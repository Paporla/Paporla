'use client';

import Card from '@/components/ui/Card';
import { Package, DollarSign, Leaf } from 'lucide-react';

interface DashboardImpactStatsProps {
  totalPacks: number;
  totalSaved: number;
  co2Avoided: number;
}

export default function DashboardImpactStats({ totalPacks, totalSaved, co2Avoided }: DashboardImpactStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <Card glass className="p-4 text-center">
        <Package className="w-6 h-6 text-primary mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{totalPacks}</div>
        <div className="text-xs text-gray-400">Packs rescatados</div>
      </Card>
      <Card glass className="p-4 text-center">
        <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">${totalSaved.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Ahorrado</div>
      </Card>
      <Card glass className="p-4 text-center">
        <Leaf className="w-6 h-6 text-green-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{co2Avoided}kg</div>
        <div className="text-xs text-gray-400">CO₂ evitado</div>
      </Card>
    </div>
  );
}