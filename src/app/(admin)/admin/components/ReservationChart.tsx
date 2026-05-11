'use client';

import Card from '@/components/ui/Card';
import { Calendar } from 'lucide-react';

interface ReservationChartProps {
  data: { day: string; reservations: number }[];
}

export default function ReservationChart({ data }: ReservationChartProps) {
  const maxReservations = Math.max(...data.map(d => d.reservations), 1);
  const totalReservations = data.reduce((sum, d) => sum + d.reservations, 0);

  return (
    <Card glass className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        Reservas por día (últimos 7 días)
      </h3>
      
      <div className="space-y-3">
        {data.map((item) => {
          const height = (item.reservations / maxReservations) * 100;
          return (
            <div key={item.day} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{item.day}</span>
                <span className="text-primary font-medium">{item.reservations} reservas</span>
              </div>
              <div className="h-8 bg-gray-800 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                  style={{ width: `${height}%` }}
                >
                  {height > 20 && (
                    <span className="text-xs text-white font-medium">{item.reservations}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total reservas (7 días)</span>
          <span className="text-white font-semibold">{totalReservations}</span>
        </div>
      </div>
    </Card>
  );
}