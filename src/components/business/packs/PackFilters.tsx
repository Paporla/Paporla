'use client';

import { Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Input from '@/components/ui/Input';

interface PackFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: 'all' | 'active' | 'inactive';
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void;
}

export default function PackFilters({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
}: PackFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const filters = [
    { id: 'all', label: 'Todos', count: null },
    { id: 'active', label: 'Activos', count: null },
    { id: 'inactive', label: 'Inactivos', count: null },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar packs por nombre..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-muted border border-dark-border hover:border-primary/30 transition-all"
        >
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filtros</span>
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-4 bg-dark-muted/50 rounded-xl border border-dark-border">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => onStatusChange(filter.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === filter.id
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-dark-muted text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}