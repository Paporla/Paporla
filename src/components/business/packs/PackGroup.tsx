'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PackCard from './PackCard';
import type { BusinessPack } from './useBusinessPacks';

interface PackGroupProps {
  title: string;
  packs: BusinessPack[];
  deleting: string | null;
  onDeleteClick: (id: string) => void;
  emptyMessage?: string;
}

export default function PackGroup({
  title,
  packs,
  deleting,
  onDeleteClick,
  emptyMessage,
}: PackGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (packs.length === 0 && emptyMessage) {
    return (
      <div className="bg-dark-card/30 rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (packs.length === 0) return null;

  return (
    <div className="bg-dark-card/30 rounded-2xl border border-dark-border overflow-hidden">
      {/* Header del grupo */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-dark-card/50 hover:bg-dark-card transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            {packs.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Contenido expandible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {packs.map((pack, idx) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  index={idx}
                  deleting={deleting}
                  onDeleteClick={onDeleteClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}