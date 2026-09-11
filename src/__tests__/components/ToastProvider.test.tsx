import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/ToastProvider'

/**
 * El ToastProvider es el ÚNICO camarero de avisos de la app (Lote UX punto 4).
 * Estos tests fijan su contrato: el aviso sale con role="alert" (accesible),
 * varios avisos se apilan, se puede cerrar a mano con la X y se cierra solo al
 * cumplirse su duración (4 s por defecto, ampliables por mensaje).
 *
 * Nota sobre las esperas: el contenedor usa AnimatePresence, así que al cerrar
 * un aviso el elemento sigue montado mientras dura la animación de salida. Por
 * eso las comprobaciones de "ya no está" van con `waitFor` y no a pelo.
 */
function Probe({
  message,
  type,
  durationMs,
}: {
  message: string
  type?: 'success' | 'error' | 'info'
  durationMs?: number
}) {
  const { addToast } = useToast()
  return (
    <button type="button" onClick={() => addToast(message, type, durationMs)}>
      avisar
    </button>
  )
}

function renderProbe(props: { message: string; type?: 'success' | 'error' | 'info'; durationMs?: number }) {
  return render(
    <ToastProvider>
      <Probe {...props} />
    </ToastProvider>,
  )
}

describe('ToastProvider (camarero global de avisos)', () => {
  it('addToast pinta el mensaje en un contenedor accesible (role=alert)', () => {
    renderProbe({ message: 'Comercio guardado en favoritos', type: 'success' })

    fireEvent.click(screen.getByRole('button', { name: 'avisar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Comercio guardado en favoritos')
  })

  it('dos avisos seguidos se apilan, los dos accesibles', () => {
    render(
      <ToastProvider>
        <Probe message="Primero" />
        <Probe message="Segundo" />
      </ToastProvider>,
    )

    const [uno, dos] = screen.getAllByRole('button', { name: 'avisar' })
    fireEvent.click(uno)
    fireEvent.click(dos)

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(screen.getByText('Primero')).toBeDefined()
    expect(screen.getByText('Segundo')).toBeDefined()
  })

  it('la X cierra el aviso', async () => {
    renderProbe({ message: 'Algo pasó', type: 'error' })

    fireEvent.click(screen.getByRole('button', { name: 'avisar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Algo pasó')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('se cierra solo al cumplirse su duración (misma vía que los 4 s por defecto)', async () => {
    // 60 ms en vez de 4 s para no alargar la suite: el mecanismo es el mismo
    // temporizador, solo cambia el número que recibe addToast.
    renderProbe({ message: 'Aviso pasajero', durationMs: 60 })

    fireEvent.click(screen.getByRole('button', { name: 'avisar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Aviso pasajero')

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull(), { timeout: 3000 })
  })

  it('un aviso largo sigue visible cuando uno corto ya se habría cerrado', async () => {
    render(
      <ToastProvider>
        <Probe message="Corto" durationMs={60} />
        <Probe message="Largo" durationMs={1200} />
      </ToastProvider>,
    )

    const [corto, largo] = screen.getAllByRole('button', { name: 'avisar' })
    fireEvent.click(corto)
    fireEvent.click(largo)
    expect(screen.getAllByRole('alert')).toHaveLength(2)

    await waitFor(() => expect(screen.queryByText('Corto')).toBeNull(), { timeout: 3000 })
    expect(screen.getByText('Largo')).toBeDefined()
  })
})
