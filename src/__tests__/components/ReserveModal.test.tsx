import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useCallback, useState } from 'react'
import ReserveModal from '@/app/(public)/packs/[id]/components/ReserveModal'
import type { PackReservationInfo, ReservationDetails } from '@/hooks/useCreateReservation'
import type { SerializedPack } from '@/app/(public)/packs/[id]/PackDetailClient'
import { trackBeginCheckout } from '@/lib/analytics/events'
import { MARKET_MISMATCH_MESSAGE } from '@/lib/utils/db-errors'

vi.mock('@/lib/analytics/events', () => ({
  trackBeginCheckout: vi.fn(),
}))

/**
 * Estado de sesión simulado. El modal solo mira `user.marketId` para decidir
 * cómo explica el MARKET_MISMATCH; el resto del perfil es irrelevante aquí.
 */
const authState = { user: null as { marketId: string | null } | null }

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
  }),
}))

const routerState = { push: vi.fn() }

vi.mock('next/navigation', () => ({
  useRouter: () => routerState,
}))

// Mock del hook CON estado real (useState): la UI re-renderiza exactamente
// como en producción cuando cambian loading/error/lastReservation.
type MockResult = { details: ReservationDetails | null; error: string }

let nextResult: MockResult = { details: null, error: '' }
const calls: Array<{ packId: string; info: PackReservationInfo }> = []

function useMockCreateReservation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [last, setLast] = useState<ReservationDetails | null>(null)

  const createReservation = useCallback(
    async (packId: string, info: PackReservationInfo): Promise<ReservationDetails | null> => {
      calls.push({ packId, info })
      setError('')
      setLoading(true)
      // nextResult se lee en el momento del clic (cada test lo configura).
      const result = nextResult
      await Promise.resolve()
      setLoading(false)
      setError(result.error)
      if (result.details) setLast(result.details)
      return result.details
    },
    [],
  )

  return {
    createReservation,
    lastReservation: last,
    clearLastReservation: () => setLast(null),
    loading,
    error,
    clearError: () => setError(''),
  }
}

vi.mock('@/hooks/useCreateReservation', () => ({
  useCreateReservation: useMockCreateReservation,
}))

function makePack(overrides: Partial<SerializedPack> = {}): SerializedPack {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Pack sorpresa de panadería',
    description: null,
    allergen_notice: null,
    category: 'panaderia',
    price_minor: 2999,
    original_price_minor: 5998,
    currency_code: 'CLP',
    remaining_stock: 3,
    pickup_start_at: '2026-09-04T19:00:00-04:00',
    pickup_end_at: '2026-09-04T23:00:00-04:00',
    timezone: 'America/Santiago',
    image_url: null,
    shop_id: '22222222-2222-4222-8222-222222222222',
    shop: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Panadería El Trigal',
      description: null,
      address: 'Av. Los Alerces 123, Santiago',
      city: 'Santiago',
      phone: null,
      logo_url: null,
      rating: 4.8,
      verified: true,
    },
    ...overrides,
  }
}

function makeDetails(overrides: Partial<ReservationDetails> = {}): ReservationDetails {
  const pack = makePack()
  return {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'payment_pending',
    paymentStatus: 'created',
    holdExpiresAt: '2026-08-24T20:10:00Z',
    amountMinor: 2999,
    currencyCode: 'CLP',
    idempotentReplay: false,
    pack: {
      title: pack.title,
      imageUrl: pack.image_url,
      price_minor: pack.price_minor,
      currency_code: pack.currency_code,
      shopName: pack.shop.name,
      shopAddress: pack.shop.address,
      pickupStartAt: pack.pickup_start_at,
      pickupEndAt: pack.pickup_end_at,
      timezone: pack.timezone,
    },
    ...overrides,
  }
}

function renderOpen(pack: SerializedPack = makePack()) {
  return render(<ReserveModal isOpen onClose={() => {}} pack={pack} />)
}

/** Acepta políticas y pulsa Reservar; devuelve el alert de error si aparece. */
async function tryReserve() {
  fireEvent.click(screen.getByRole('checkbox'))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
  })
  return screen.findByRole('alert')
}

beforeEach(() => {
  nextResult = { details: null, error: '' }
  calls.length = 0
  authState.user = null
  vi.mocked(trackBeginCheckout).mockClear()
  routerState.push.mockClear()
})

describe('ReserveModal', () => {
  it('no renderiza nada cuando está cerrada', () => {
    render(<ReserveModal isOpen={false} onClose={() => {}} pack={makePack()} />)
    expect(screen.queryByText('Confirmar reserva')).toBeNull()
  })

  it('muestra el resumen honesto: pack, comercio, dirección, ventana, stock y precio CLP sin decimales', () => {
    renderOpen()
    expect(screen.getByText('Pack sorpresa de panadería')).toBeDefined()
    expect(screen.getByText('Panadería El Trigal')).toBeDefined()
    expect(screen.getByText('Av. Los Alerces 123, Santiago')).toBeDefined()
    expect(screen.getByText(/\$2\.999/)).toBeDefined()
    expect(screen.getByText(/Quedan 3 en stock/)).toBeDefined()
    expect(screen.getByText(/viernes/)).toBeDefined()
  })

  it('botón confirmación deshabilitado sin aceptar políticas, con explicación del motivo', () => {
    renderOpen()
    expect(screen.getByRole('button', { name: 'Reservar' })).toBeDisabled()
    expect(screen.getByText('Debes aceptar las políticas para reservar.')).toBeDefined()
  })

  it('con políticas aceptadas, llama a reservar con los datos canónicos del pack', async () => {
    nextResult = { details: makeDetails(), error: '' }
    renderOpen()
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
    })
    await screen.findByText('¡Pack reservado!')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.packId).toBe('11111111-1111-4111-8111-111111111111')
    expect(calls[0]?.info).toMatchObject({
      title: 'Pack sorpresa de panadería',
      price_minor: 2999,
      currency_code: 'CLP',
      shopName: 'Panadería El Trigal',
      shopAddress: 'Av. Los Alerces 123, Santiago',
      pickupStartAt: '2026-09-04T19:00:00-04:00',
      pickupEndAt: '2026-09-04T23:00:00-04:00',
      timezone: 'America/Santiago',
    })
  })

  it('éxito sin código de recogida: promete el código "en Mis reservas" y da el enlace', async () => {
    nextResult = { details: makeDetails(), error: '' }
    renderOpen()
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reservar' }))
    })
    await screen.findByText('¡Pack reservado!')

    expect(screen.getByText(/código de recogida aparecerá en Mis reservas/)).toBeDefined()
    expect(screen.getByRole('link', { name: /mis reservas/i })).toBeDefined()
    // La UI vieja mostraba un código inventado ("Presenta este código…"): eso no puede volver.
    expect(screen.queryByText(/Presenta este código/i)).toBeNull()
    // En la pantalla de éxito no queda botón de confirmación.
    expect(screen.queryByRole('button', { name: 'Reservar' })).toBeNull()
  })

  it('error: muestra el mensaje traducido y permite reintentar (misma intención de reserva)', async () => {
    nextResult = { details: null, error: 'El pack ya no está disponible.' }
    renderOpen()
    await tryReserve()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El pack ya no está disponible.')

    nextResult = { details: makeDetails(), error: '' }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    })
    await screen.findByText('¡Pack reservado!')
    expect(calls).toHaveLength(2)
  })

  describe('MARKET_MISMATCH (create_payment_reservation, 0009:285)', () => {
    it('perfil sin mercado: explica que falta elegirlo, ofrece el botón y no el Reintentar de siempre', async () => {
      authState.user = { marketId: null }
      nextResult = { details: null, error: MARKET_MISMATCH_MESSAGE }
      renderOpen()
      await tryReserve()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Aún no has elegido tu mercado')
      expect(alert).toHaveTextContent(/Mi perfil/)

      // Reintentar sin cambiar de mercado da siempre igual: no se ofrece.
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()

      // El CTA lleva a Mi perfil, donde vive el selector de mercado.
      fireEvent.click(screen.getByRole('button', { name: 'Elegir mi mercado' }))
      expect(routerState.push).toHaveBeenCalledWith('/profile')
    })

    it('perfil con otro mercado: explica el choque y ofrece cambiarlo', async () => {
      authState.user = { marketId: '10000000-0000-4000-8000-000000000002' }
      nextResult = { details: null, error: MARKET_MISMATCH_MESSAGE }
      renderOpen()
      await tryReserve()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Este pack es de otro mercado')
      expect(alert).toHaveTextContent(/Cámbialo para reservar este pack/)

      fireEvent.click(screen.getByRole('button', { name: 'Cambiar mi mercado' }))
      expect(routerState.push).toHaveBeenCalledWith('/profile')
    })

    it('errores que no son de mercado no muestran el bloque de mercado', async () => {
      authState.user = { marketId: null }
      nextResult = { details: null, error: 'El pack ya no está disponible.' }
      renderOpen()
      await tryReserve()

      expect(await screen.findByRole('alert')).toHaveTextContent('El pack ya no está disponible.')
      expect(screen.queryByRole('button', { name: /Elegir mi mercado|Cambiar mi mercado/ })).toBeNull()
      // El flujo normal de error sigue intacto.
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined()
    })
  })

  it('dispara begin_checkout al abrir, una vez, con los datos del pack', () => {
    renderOpen()
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(trackBeginCheckout)).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'Pack sorpresa de panadería',
      2999,
      'CLP',
      'Panadería El Trigal',
    )
  })

  it('cierra con Escape', () => {
    const onClose = vi.fn()
    render(<ReserveModal isOpen onClose={onClose} pack={makePack()} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra con clic en el fondo (el layer de pantalla completa, no en el panel)', () => {
    const onClose = vi.fn()
    render(<ReserveModal isOpen onClose={onClose} pack={makePack()} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('bottom sheet en móvil / centrado en escritorio, y el contenido se scrolle adentro (footer siempre visible)', () => {
    renderOpen()
    const dialog = screen.getByRole('dialog')
    // Móvil: anclado abajo. Escritorio: centrado (flexbox, no translate:
    // framer-motion pisaría los translate de Tailwind — el bug del modal "muy abajo").
    expect(dialog.className).toContain('items-end')
    expect(dialog.className).toContain('sm:items-center')
    const panel = dialog.firstElementChild as HTMLElement
    expect(panel.className).toContain('max-h-[100dvh]')
    expect(panel.className).toContain('flex flex-col')
    const scrollable = Array.from(panel.querySelectorAll('div')).find((el) => el.className.includes('overflow-y-auto'))
    expect(scrollable).toBeDefined()
  })
})
