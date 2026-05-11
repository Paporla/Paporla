'use client';

import { motion } from 'framer-motion';
import { Star, Award, Trophy } from 'lucide-react';

interface ProfileLevelProps {
  level: string;
  points: number;
  nextLevelPoints: number;
  nextLevelName: string;
}

const levelConfig: Record<string, { icon: any; color: string; bg: string }> = {
  'Rescatador Principiante': { icon: Star, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  'Rescatador Pro': { icon: Award, color: 'text-primary', bg: 'bg-primary/10' },
  'Rescatador Élite': { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

export default function ProfileLevel({ level, points, nextLevelPoints, nextLevelName }: ProfileLevelProps) {
  const config = levelConfig[level] || levelConfig['Rescatador Principiante'];
  const Icon = config.icon;
  const progress = Math.min((points / nextLevelPoints) * 100, 100);
  const remaining = nextLevelPoints - points;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-dark-card border border-dark-border rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Nivel actual</p>
            <p className="font-bold text-white">{level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Puntos</p>
          <p className="font-bold text-primary">{points} pts</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progreso a {nextLevelName}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-dark-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500">
          ✨ Te faltan <span className="text-primary font-medium">{remaining} puntos</span> para llegar a {nextLevelName}
        </p>
      </div>
    </motion.div>
  );
}