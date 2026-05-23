'use client'

import type { PackWithShop } from '@/types/pack'
import PackCardCompact from './PackCardCompact'
import PackCardDefault from './PackCardDefault'

interface PackCardProps {
  pack: PackWithShop
  onClick?: () => void
  onReserve?: (packId: string) => void
  variant?: 'default' | 'compact'
  className?: string
  showFavoriteButton?: boolean
  showShopName?: boolean
  glass?: boolean
}

export default function PackCard({
  pack,
  onClick,
  onReserve,
  variant = 'default',
  className = '',
  showFavoriteButton = true,
  showShopName: _showShopName = true,
  glass: _glass = false,
}: PackCardProps) {
  const handleClick =
    onClick ||
    (() => {
      if (onReserve) onReserve(pack.id)
    })
  if (variant === 'compact') {
    return (
      <PackCardCompact
        pack={pack}
        onClick={handleClick}
        className={className}
        showFavoriteButton={showFavoriteButton}
      />
    )
  }

  return (
    <PackCardDefault pack={pack} onClick={handleClick} className={className} showFavoriteButton={showFavoriteButton} />
  )
}
