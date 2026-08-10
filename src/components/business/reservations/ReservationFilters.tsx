'use client'

import { Search, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import Input from '@/components/ui/Input'

interface ReservationFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

const statusOptions = [
  { value: 'all', label: 'Todas', color: 'text-gray-400' },
  { value: 'pending', label: 'Pendientes', color: 'text-yellow-400' },
  { value: 'confirmed', label: 'Confirmadas', color: 'text-blue-400' },
  { value: 'ready_pickup', label: 'Listas', color: 'text-primary' },
  { value: 'picked_up', label: 'Recogidas', color: 'text-green-400' },
  { value: 'no_show', label: 'No retiradas', color: 'text-orange-400' },
  { value: 'cancelled', label: 'Canceladas', color: 'text-red-400' },
]

export default function ReservationFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ReservationFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por cliente, email o pack..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-dark-muted bg-gray-100 border dark:border-dark-border border-gray-200 hover:border-primary/30 transition-all"
        >
          <Filter className="w-4 h-4 dark:text-gray-400 text-gray-500" />
          <span className="text-sm dark:text-gray-400 text-gray-500">Filtros</span>
          {statusFilter !== 'all' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
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
            <div className="flex flex-wrap gap-2 p-4 dark:bg-dark-muted/50 bg-gray-50 rounded-xl border dark:border-dark-border border-gray-200">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onStatusFilterChange(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === option.value
                      ? `${option.color} bg-primary/10 border border-primary/30`
                      : 'dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:hover:bg-white/5 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
