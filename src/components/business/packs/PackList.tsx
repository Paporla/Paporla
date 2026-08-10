'use client'

import { motion } from 'framer-motion'
import PackCard from './PackCard'
import { BusinessPack } from './useBusinessPacks'
import EmptyState from '@/components/ui/EmptyState'

interface PackListProps {
  packs: BusinessPack[]
  deleting: string | null
  onDeleteClick: (id: string) => void
}

export default function PackList({ packs, deleting, onDeleteClick }: PackListProps) {
  if (packs.length === 0) {
    return (
      <EmptyState
        type="packs"
        action={{
          label: 'Crear mi primer pack',
          onClick: () => (window.location.href = '/business/packs/new'),
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {packs.map((pack, index) => (
        <motion.div
          key={pack.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <PackCard pack={pack} index={index} deleting={deleting} onDeleteClick={onDeleteClick} />
        </motion.div>
      ))}
    </div>
  )
}
