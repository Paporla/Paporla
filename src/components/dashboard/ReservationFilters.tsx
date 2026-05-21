'use client';

import { motion } from 'framer-motion';

interface ReservationFiltersProps {
  activeFilter: 'all' | 'confirmed';
  onFilterChange: (filter: 'all' | 'confirmed') => void;
  counts: {
    all: number;
    confirmed: number;
  };
}

export default function ReservationFilters({ activeFilter, onFilterChange, counts }: ReservationFiltersProps) {
    const filters = [
    { value: 'all' as const, label: 'Todas', count: counts.all },
    { value: 'confirmed' as const, label: 'Confirmadas', count: counts.confirmed },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeFilter === filter.value
              ? 'text-primary'
              : 'dark:text-gray-400 text-gray-600 hover:dark:text-white hover:text-gray-900'
          }`}
        >
          {activeFilter === filter.value && (
            <motion.div
              layoutId="activeFilter"
              className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/30"
              transition={{ duration: 0.2 }}
            />
          )}
          <span className="relative z-10">
            {filter.label}
            <span className="ml-1 text-xs opacity-60">({filter.count})</span>
          </span>
        </button>
      ))}
    </div>
  );
}