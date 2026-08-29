import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced'

/**
 * F8.5 (S4): la busqueda del catalogo dispara una RPC a la base en cada
 * cambio. El input debe seguir siendo instantaneo, pero la notificacion al
 * padre (y la query) se deboncea 350 ms.
 */
describe('PackFiltersAdvanced — debounce de la busqueda (f8.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup() {
    const onFilterChange = vi.fn()
    render(<PackFiltersAdvanced onFilterChange={onFilterChange} cities={['Santiago', 'Providencia']} />)
    const input = screen.getByPlaceholderText('Buscar packs por nombre o descripcion...')
    return { onFilterChange, input }
  }

  it('teclear rapidito no dispara queries: una sola notificacion al parar 350 ms', () => {
    const { onFilterChange, input } = setup()
    expect(onFilterChange).toHaveBeenCalledTimes(1) // montaje (filtros iniciales)

    fireEvent.change(input, { target: { value: 'p' } })
    fireEvent.change(input, { target: { value: 'pa' } })
    fireEvent.change(input, { target: { value: 'pan' } })
    expect(onFilterChange).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(349)
    })
    expect(onFilterChange).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onFilterChange).toHaveBeenCalledTimes(2)
    expect(onFilterChange.mock.calls.at(-1)![0]).toMatchObject({ search: 'pan' })
  })

  it('el input se actualiza al instante (el usuario no siente el debounce)', () => {
    const { input } = setup()
    fireEvent.change(input, { target: { value: 'sushi' } })
    expect((input as HTMLInputElement).value).toBe('sushi')
  })

  it('cambiar otro filtro con busqueda pendiente no pierde ningun valor', () => {
    const { onFilterChange, input } = setup()
    fireEvent.change(input, { target: { value: 'pan' } })

    // Abrir el panel de filtros y elegir ciudad
    // (fireEvent.change sobre el select: el patrón de los tests de este repo)
    fireEvent.click(screen.getByRole('button'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'Providencia' } })

    // La ciudad se notifica al instante…
    const instant = onFilterChange.mock.calls.at(-1)![0] as { search: string; city: string }
    expect(instant.city).toBe('Providencia')
    expect(instant.search).toBe('pan')

    // …y cuando dispara el debounce, sigue teniendo los dos
    act(() => {
      vi.advanceTimersByTime(350)
    })
    const last = onFilterChange.mock.calls.at(-1)![0] as { search: string; city: string }
    expect(last).toMatchObject({ search: 'pan', city: 'Providencia' })
  })

  it('"Limpiar todos" cancela la busqueda pendiente (sin query fantasma)', () => {
    const { onFilterChange, input } = setup()
    fireEvent.change(input, { target: { value: 'pan' } })

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button', { name: /Limpiar todos/i }))

    const afterClear = onFilterChange.mock.calls.at(-1)![0] as { search: string }
    expect(afterClear.search).toBe('')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // solo montaje + limpiar: nada mas
    expect(onFilterChange).toHaveBeenCalledTimes(2)
  })
})
