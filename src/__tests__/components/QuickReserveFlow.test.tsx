import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickReserveFlow from '@/components/reservations/QuickReserveFlow'

const mockCreateReservation = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test User', email: 'test@test.com' } })),
}))

vi.mock('@/hooks/useReservations', () => ({
  useReservations: vi.fn(() => ({
    createReservation: mockCreateReservation,
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

const mockPack = {
  id: 'pack-1',
  title: 'Pack Test',
  description: 'Descripcion del pack',
  price_cents: 1500,
  image_url: null,
  pickup_date: '2024-12-25',
  pickup_start_time: '10:00:00',
  pickup_end_time: '12:00:00',
  remaining_stock: 5,
  shop_id: 'shop-1',
  shop: { id: 'shop-1', name: 'Shop Test', address: 'Calle 123', phone: '555-1234' },
}

const defaultProps = {
  pack: mockPack,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

describe('QuickReserveFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders review step correctly', () => {
    render(<QuickReserveFlow {...defaultProps} />)
    expect(screen.getByText('Pack Test')).toBeInTheDocument()
    expect(screen.getByText('Shop Test')).toBeInTheDocument()
    expect(screen.getByText(/Confirmar Reserva/)).toBeInTheDocument()
  })

  it('calls createReservation when clicking Confirmar Reserva', async () => {
    const user = userEvent.setup()
    mockCreateReservation.mockResolvedValue({ success: true, pickup_code: 'ABC123' })

    render(<QuickReserveFlow {...defaultProps} />)
    await user.click(screen.getByText(/Confirmar Reserva/))

    expect(mockCreateReservation).toHaveBeenCalledWith({
      packId: 'pack-1',
      quantity: 1,
      paymentMethod: 'demo',
    })
  })

  it('displays error state with error message', async () => {
    const user = userEvent.setup()
    mockCreateReservation.mockRejectedValue(new Error('Stock insuficiente'))

    render(<QuickReserveFlow {...defaultProps} />)
    await user.click(screen.getByText(/Confirmar Reserva/))

    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument()
  })
})
