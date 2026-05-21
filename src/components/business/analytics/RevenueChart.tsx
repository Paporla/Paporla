'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  title?: string;
  trend?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-xl">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-lg font-bold text-green-400">
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data, title = 'Ingresos', trend = 0 }: RevenueChartProps) {
  const isPositive = trend >= 0;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-dark-card dark:bg-white dark:border-gray-200 border border-dark-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="font-bold dark:text-white text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="dark:text-gray-500 text-gray-400 text-sm">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card dark:bg-white dark:border-gray-200 border border-dark-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="font-bold dark:text-white text-gray-900">{title}</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold dark:text-white text-gray-900">${total.toFixed(2)}</span>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{trend}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#666', fontSize: 11 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fill: '#666', fontSize: 11 }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#00ff88" 
              strokeWidth={2} 
              fill="url(#revenueGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}