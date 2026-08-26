import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PickupCodeValidator from '@/components/business/PickupCodeValidator'
import { supabaseBrowser } from '@/lib/supabase/client'

let rpc: ReturnType<typeof vi.fn>

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function setupMockClient() {
  rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'validate_pickup')
      return Promise.resolve({
        data: { success: true, reservation_id: 'r-1', pack_title: 'Pack Panadería Artesanal', quantity: 1 },
        error: null,
      })
    return Promise.resolve({ data: { success: true }, error: null })
  })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ rpc, from: vi.fn() })
}

describe('PickupCodeValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
  })

  it('valida con p_credential (NUNCA p_pickup_code), muestra el pack de la respuesta y refresca las listas', async () => {
    const client = createClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(<PickupCodeValidator shopId="shop-a" />, { wrapper: createWrapper(client) })

    fireEvent.change(screen.getByPlaceholderText('P4P-XXXXXXXX'), { target: { value: 'P4P-ABCD1234' } })
    fireEvent.click(screen.getByRole('button', { name: /Validar/ }))

    expect(rpc).toHaveBeenCalledWith('validate_pickup', { p_credential: 'P4P-ABCD1234' })
    const callArgs = rpc.mock.calls[0][1] as Record<string, unknown>
    expect(callArgs).not.toHaveProperty('p_pickup_code')

    expect(await screen.findByText('Recogida validada con éxito.')).toBeTruthy()
    expect(screen.getByText('Pack: Pack Panadería Artesanal')).toBeTruthy()

    // La reserva pasó a picked_up: las tres listas deben refrescarse.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['today-pickups-ready', 'shop-a'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['today-pickups-confirmed', 'shop-a'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['business-reservations', 'shop-a'] })
  })

  it('traduce a español OUTSIDE_PICKUP_WINDOW (ventana del 30 sept, por ejemplo)', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'validate_pickup')
        return Promise.resolve({ data: null, error: { message: 'OUTSIDE_PICKUP_WINDOW', code: 'P0001' } })
      return Promise.resolve({ data: { success: true }, error: null })
    })
    render(<PickupCodeValidator shopId="shop-a" />, { wrapper: createWrapper(createClient()) })

    fireEvent.change(screen.getByPlaceholderText('P4P-XXXXXXXX'), { target: { value: 'P4P-ABCD1234' } })
    fireEvent.click(screen.getByRole('button', { name: /Validar/ }))

    expect(await screen.findByText(/La recogida aún no está dentro de su horario/)).toBeTruthy()
    expect(screen.queryByText(/OUTSIDE_PICKUP_WINDOW/)).toBeNull()
  })

  it('un código demasiado corto no dispara la RPC', () => {
    render(<PickupCodeValidator shopId="shop-a" />, { wrapper: createWrapper(createClient()) })

    const input = screen.getByPlaceholderText('P4P-XXXXXXXX')
    fireEvent.change(input, { target: { value: 'P4P-1' } })
    const button = screen.getByRole('button', { name: /Validar/ })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('no inventa datos de contacto del cliente en el panel de éxito', async () => {
    const { container } = render(<PickupCodeValidator shopId="shop-a" />, {
      wrapper: createWrapper(createClient()),
    })

    fireEvent.change(screen.getByPlaceholderText('P4P-XXXXXXXX'), { target: { value: 'P4P-ABCD1234' } })
    fireEvent.click(screen.getByRole('button', { name: /Validar/ }))
    await screen.findByText('Recogida validada con éxito.')

    expect(container.textContent).not.toMatch(/@|\+\d{6,}/)
  })
})
