'use client'

import { Search } from 'lucide-react'
import Input from '@/components/ui/Input'

interface Props {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

export default function ReservationFilters({ searchTerm, onSearchChange, statusFilter, onStatusFilterChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Buscar por cliente, email o pack..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary focus:outline-none transition-all"
      >
        <option value="all">Todos los estados</option>
        <option value="pending">Pendientes</option>
        <option value="confirmed">Confirmadas</option>
        <option value="ready_pickup">Listas para recoger</option>
        <option value="picked_up">Retiradas</option>
        <option value="no_show">No retiradas</option>
        <option value="cancelled">Canceladas</option>
      </select>
    </div>
  )
}
