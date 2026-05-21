import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PackGrid from '@/components/packs/PackGrid'
import type { PackWithShop } from '@/types/pack'

vi.mock('@/components/packs/PackCard', () => ({
  default: ({ pack, onReserve }: { pack: any; onReserve?: (id: string) => void }) => (
    <div data-testid="pack-card" onClick={() => onReserve?.(pack.id)}>
      {pack.title}
    </div>
  ),
}))

vi.mock('@/components/packs/PackGridSkeleton', () => ({
  default: () => <div data-testid="pack-grid-skeleton">Loading...</div>,
}))

const mockPacks: PackWithShop[] = [
  {
    id: '1',
    title: 'Pack 1',
    price_cents: 1500,
    remaining_stock: 5,
    total_stock: 10,
    is_active: true,
    shop: { name: 'Shop 1', address: 'Address 1', phone: '123', verified: true },
  },
  {
    id: '2',
    title: 'Pack 2',
    price_cents: 2000,
    remaining_stock: 3,
    total_stock: 8,
    is_active: true,
    shop: { name: 'Shop 2', address: 'Address 2', phone: '456', verified: false },
  },
] as unknown as PackWithShop[]

describe('PackGrid', () => {
  it('shows skeleton when loading', () => {
    render(<PackGrid packs={[]} loading={true} />)
    expect(screen.getByTestId('pack-grid-skeleton')).toBeInTheDocument()
  })

  it('shows empty state when no packs', () => {
    render(<PackGrid packs={[]} loading={false} />)
    expect(screen.getByText(/No hay packs disponibles/)).toBeInTheDocument()
  })

  it('renders pack cards when packs are provided', () => {
    render(<PackGrid packs={mockPacks} loading={false} />)
    const cards = screen.getAllByTestId('pack-card')
    expect(cards).toHaveLength(2)
  })

  it('shows pack titles', () => {
    render(<PackGrid packs={mockPacks} loading={false} />)
    expect(screen.getByText('Pack 1')).toBeInTheDocument()
    expect(screen.getByText('Pack 2')).toBeInTheDocument()
  })

  it('calls onReserve when a pack card is clicked', async () => {
    const handleReserve = vi.fn()
    const { container } = render(
      <PackGrid packs={mockPacks} loading={false} onReserve={handleReserve} />
    )
    const firstCard = container.querySelector('[data-testid="pack-card"]')
    if (firstCard) {
      firstCard.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    expect(handleReserve).toHaveBeenCalledWith('1')
  })
})
