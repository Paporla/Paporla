'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReservationCard from './ReservationCard';
import type { ReservationItem } from './useBusinessReservations';

interface ReservationGroupProps {
  title: string;
  reservations: ReservationItem[];
  updating: string | null;
  onValidate?: (id: string) => void;
  onNoShow?: (id: string) => void;
  onCancelClick?: (id: string) => void;
}

export default function ReservationGroup({
  title,
  reservations,
  updating,
  onValidate,
  onNoShow,
  onCancelClick,
}: ReservationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (reservations.length === 0) return null;

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
            {reservations.length}
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
              {reservations.map((reservation, idx) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  index={idx}
                  updating={updating}
                  onValidate={onValidate}
                  onNoShow={onNoShow}
                  onCancelClick={onCancelClick}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}