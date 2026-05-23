'use client'

import { useState } from 'react'
import PackCard from './PackCard'
import PackGridSkeleton from './PackGridSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import type { PackWithShop } from '@/types/pack'

interface SearchResultsProps {
  packs: PackWithShop[]
  loading: boolean
  searchTerm: string
  onClearSearch: () => void
  onPackClick: (pack: PackWithShop) => void
}

export default function SearchResults({ packs, loading, searchTerm, onClearSearch, onPackClick }: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (loading) {
    return <PackGridSkeleton />
  }

  if (packs.length === 0) {
    return (
      <EmptyState
        type="search"
        action={
          searchTerm
            ? {
                label: 'Limpiar búsqueda',
                onClick: onClearSearch,
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Resultados count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {packs.length} {packs.length === 1 ? 'pack encontrado' : 'packs encontrados'}
        </p>

        {/* Toggle view mode */}
        <div className="flex gap-1 bg-dark-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid/List view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} onClick={() => onPackClick(pack)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map((pack) => (
            <PackCard key={pack.id} pack={pack} onClick={() => onPackClick(pack)} variant="compact" />
          ))}
        </div>
      )}
    </div>
  )
}
