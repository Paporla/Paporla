import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Formulario de pack (crear / editar / duplicar) — avisos y validaciones.
 *
 * Cubre el Lote 9c de L-31: el formulario tenía DOS sistemas de aviso a la vez
 * (una caja fija dentro del formulario y dos `<Toast>` locales duplicados) y
 * enseñaba solo el PRIMERO de los errores de validación, así que el comercio
 * los iba descubriendo de uno en uno, a pulsación por error. Ahora:
 *
 *   - validación  -> escrita debajo de cada campo, en rojo, hasta que se corrige
 *   - éxito       -> toast global (ToastProvider), que sobrevive a la navegación
 *   - fallo       -> caja fija con role="alert" junto al botón (sin temporizador)
 *
 * Los subcomponentes se renderizan de verdad (no se simulan): lo que se prueba
 * es que el error llega al input correcto, no que el padre llame a un hijo.
 */

const mockRpc = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockRefresh = vi.hoisted(() => vi.fn())
const mockBack = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh, back: mockBack }),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    rpc: mockRpc,
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: { path: 'packs/pk-1/x.png' }, error: null })),
        remove: vi.fn(async () => ({ error: null })),
        download: vi.fn(async () => ({ data: { blob: async () => new Blob() }, error: null })),
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/x.png' } }),
      }),
    },
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import PackFormSimplified from '@/components/business/PackFormSimplified'

function renderForm(props: { shopImagePath?: string | null } = {}) {
  return render(
    <ToastProvider>
      <PackFormSimplified shopId="sh-1" shopImagePath={props.shopImagePath} />
    </ToastProvider>,
  )
}

const saveButton = () => screen.getByRole('button', { name: 'Guardar borrador' })

/** Rellena lo mínimo para que validatePackForm no devuelva nada. */
function fillValidPack() {
  fireEvent.change(screen.getByLabelText('Título del pack *'), { target: { value: 'Pack de panadería' } })
  fireEvent.change(screen.getByLabelText('Precio (CLP) *'), { target: { value: '3990' } })
  // Franja 09:00 – 12:00 (el nombre accesible incluye el hint, que la distingue
  // del atajo de día "Mañana").
  fireEvent.click(screen.getByRole('button', { name: /09:00/ }))
}

describe('PackFormSimplified — avisos y validaciones (L-31, lote 9c)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    // La memoria de la última ventana vive en localStorage y cambia con qué
    // horas nace el formulario: se limpia para que cada caso parta de cero.
    window.localStorage.clear()
  })

  it('nace limpio: sin errores pintados antes del primer intento', () => {
    renderForm()

    expect(screen.queryByText('El titulo es requerido')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('al guardar con campos vacíos enseña TODOS los errores, cada uno en su campo, y ningún aviso volador', async () => {
    renderForm()

    fireEvent.click(saveButton())

    // Título y precio, debajo de su input (el Input los pinta con aria-describedby).
    expect(await screen.findByText('El titulo es requerido')).toBeInTheDocument()
    expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Título del pack *')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Precio (CLP) *')).toHaveAttribute('aria-invalid', 'true')

    // Las dos horas obligatorias salen juntas bajo la franja horaria, no de una
    // en una: es un solo olvido (no elegir franja), no dos.
    expect(screen.getByText('La hora de inicio es obligatoria · La hora de fin es obligatoria')).toBeInTheDocument()

    // Ni caja de error ni toast: los errores de validación no "avisan", se leen
    // donde están. El role="alert" queda reservado para fallos reales.
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    // Y no se tocó la base de datos con un formulario inválido.
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('con la memoria de la última ventana (Lote D), el formulario nace con las horas puestas y su error no sale', async () => {
    // Lo que ve el comercio habitual: ya guardó un pack antes, así que las horas
    // vienen solas y de la validación solo quedan los campos que faltan de
    // verdad. No es que el error de horas no funcione: es que no hay error.
    window.localStorage.setItem('paporla_last_pickup_times', JSON.stringify({ start: '18:00', end: '21:00' }))
    renderForm()

    fireEvent.click(saveButton())

    expect(await screen.findByText('El titulo es requerido')).toBeInTheDocument()
    expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument()
    expect(screen.queryByText(/hora de inicio es obligatoria/)).not.toBeInTheDocument()
    expect(screen.queryByText(/hora de fin es obligatoria/)).not.toBeInTheDocument()
  })

  it('si la memoria trae basura, se ignora y las horas vuelven a pedirse', async () => {
    // getRememberedPickupTimes revalida todo lo que lee de localStorage: solo
    // entran HH:MM con inicio < fin. Con algo inválido el formulario nace vacío
    // y la validación pide las horas como a un comercio primerizo.
    window.localStorage.setItem('paporla_last_pickup_times', JSON.stringify({ start: '25:99', end: '18:00' }))
    renderForm()

    fireEvent.click(saveButton())

    expect(
      await screen.findByText('La hora de inicio es obligatoria · La hora de fin es obligatoria'),
    ).toBeInTheDocument()
  })

  it('cada error se apaga solo al corregir su campo, sin volver a pulsar guardar', async () => {
    renderForm()
    fireEvent.click(saveButton())
    await screen.findByText('El titulo es requerido')

    fireEvent.change(screen.getByLabelText('Título del pack *'), { target: { value: 'Pack sorpresa' } })

    await waitFor(() => expect(screen.queryByText('El titulo es requerido')).not.toBeInTheDocument())
    // Los que siguen sin corregir siguen a la vista: no se borra todo de golpe.
    expect(screen.getByText('El precio debe ser mayor a 0')).toBeInTheDocument()
  })

  it('si falla el guardado, el motivo se queda escrito en su caja junto al botón y no vuela ningún toast', async () => {
    renderForm()
    fillValidPack()
    mockRpc.mockImplementation((fn: string) =>
      fn === 'create_pack_draft'
        ? Promise.resolve({ data: null, error: { message: 'INVALID_PICKUP_WINDOW', code: 'P0001' } })
        : Promise.resolve({ data: null, error: null }),
    )

    fireEvent.click(saveButton())

    const box = await screen.findByRole('alert')
    // Mensaje traducido desde el RAISE EXCEPTION de la RPC, no el código crudo.
    expect(box).toHaveTextContent('La hora de fin de la recogida debe ser posterior a la de inicio.')
    // Un único alert: antes eran dos (caja + Toast duplicado diciendo lo mismo).
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    // La caja no tiene cierre ni temporizador: el comercio la lee cuando quiere.
    expect(screen.queryByRole('button', { name: /cerrar/i })).not.toBeInTheDocument()
  })

  it('guardado con éxito: el aviso viaja al camarero global (sobrevive a la navegación) y ya no hay caja verde', async () => {
    renderForm()
    fillValidPack()
    mockRpc.mockImplementation((fn: string) =>
      fn === 'create_pack_draft'
        ? Promise.resolve({ data: { pack_id: 'pk-1' }, error: null })
        : Promise.resolve({ data: null, error: null }),
    )

    fireEvent.click(saveButton())

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Pack guardado como borrador. Falta imagen para publicar.')
    // La caja verde de "Exito" dentro del formulario desapareció: el toast sigue
    // vivo cuando la pantalla cambia a /business/packs.
    expect(screen.queryByText('Exito')).not.toBeInTheDocument()

    // Navega al listado y el aviso sigue ahí (vive en el ToastProvider, no en la página).
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/business/packs'), { timeout: 3000 })
    expect(mockRefresh).toHaveBeenCalled()
    expect(screen.getByText('Pack guardado como borrador. Falta imagen para publicar.')).toBeInTheDocument()
  })

  it('publicar con éxito avisa por el camarero global, no por la caja verde', async () => {
    // Publicar exige foto y aviso de alérgenos (getPublishBlockers): se ponen
    // para que el botón principal esté disponible de verdad.
    renderForm({ shopImagePath: 'shop-images/default.png' })
    fillValidPack()
    fireEvent.change(screen.getByPlaceholderText(/Puede contener gluten/), {
      target: { value: 'Puede contener gluten.' },
    })
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'create_pack_draft') return Promise.resolve({ data: { pack_id: 'pk-1' }, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar y publicar/ }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('Pack publicado. Ya se puede reservar.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
