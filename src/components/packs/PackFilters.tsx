'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'

interface PackFiltersProps {
  onFilterChange: (filters: Filters) => void
}

interface Filters {
  search: string
  minPrice: number
  maxPrice: number
  showAvailableOnly: boolean
}

export default function PackFilters({ onFilterChange }: PackFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    minPrice: 0,
    maxPrice: 100000,
    showAvailableOnly: false,
  })

  const handleChange = (key: keyof Filters, value: string | number | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          label="Buscar"
          placeholder="Buscar packs..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Precio mínimo</label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Precio máximo</label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showAvailableOnly}
              onChange={(e) => handleChange('showAvailableOnly', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-300">Solo disponibles</span>
          </label>
        </div>
      </div>
    </div>
  )
}
