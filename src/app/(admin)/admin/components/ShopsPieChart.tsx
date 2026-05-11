'use client';

import Card from '@/components/ui/Card';
import { Store, CheckCircle, Clock, Ban } from 'lucide-react';

interface ShopsPieChartProps {
  verified: number;
  pending: number;
  banned: number;
  total: number;
}

export default function ShopsPieChart({ verified, pending, banned, total }: ShopsPieChartProps) {
  const getPercentage = (value: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const stats = [
    { label: 'Verificados', value: verified, percentage: getPercentage(verified), icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', barColor: 'bg-green-500' },
    { label: 'Pendientes', value: pending, percentage: getPercentage(pending), icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', barColor: 'bg-yellow-500' },
    { label: 'Baneados', value: banned, percentage: getPercentage(banned), icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10', barColor: 'bg-red-500' },
  ];

  if (total === 0) {
    return (
      <Card glass className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          Estado de Comercios
        </h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-400">No hay comercios registrados</p>
        </div>
      </Card>
    );
  }

  return (
    <Card glass className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Store className="w-5 h-5 text-primary" />
        Estado de Comercios
      </h3>
      
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-3 h-3 ${stat.color}`} />
                </div>
                <span className="text-gray-400">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
                <span className="text-gray-500 text-xs">({stat.percentage}%)</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${stat.barColor} rounded-full transition-all duration-500`}
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total comercios</span>
          <span className="text-white font-semibold">{total}</span>
        </div>
      </div>
    </Card>
  );
}