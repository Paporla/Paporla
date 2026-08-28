import { describe, it, expect, vi, afterEach } from 'vitest'
import { RpcTimeoutError, rpcWithTimeout, DEFAULT_RPC_TIMEOUT_MS } from '@/lib/utils/rpcWithTimeout'

/**
 * rpcWithTimeout (Fase 6.6): carrera entre la RPC y un timeout de red, para
 * que una petición que no responde (staging "dormido", conexión colgada) no
 * deje el panel admin en el skeleton de carga para siempre.
 */

const okResult = { data: { users: 1 }, error: null }

describe('rpcWithTimeout (Fase 6.6)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resuelve con el resultado de la RPC si responde a tiempo', async () => {
    await expect(rpcWithTimeout(Promise.resolve(okResult), 'admin_counts', 1000)).resolves.toEqual(okResult)
  })

  it('propaga el error de la RPC si responde con error (no lo convierte)', async () => {
    const errorResult = { data: null, error: { message: 'ADMIN_REQUIRED', code: '42501' } }
    await expect(rpcWithTimeout(Promise.resolve(errorResult), 'admin_counts', 1000)).resolves.toEqual(errorResult)
  })

  it('rechaza con RpcTimeoutError si la RPC no responde dentro del límite', async () => {
    vi.useFakeTimers()
    const nuncaResponde: Promise<{ data: unknown; error: { message: string; code?: string } | null }> = new Promise(
      () => {},
    )
    const promesa = rpcWithTimeout(nuncaResponde, 'admin_dashboard_trend', 5000)
    const assertion = promesa.then(
      () => {
        throw new Error('no debería resolver si la RPC no responde')
      },
      (e: unknown) => {
        expect(e).toBeInstanceOf(RpcTimeoutError)
        expect((e as RpcTimeoutError).message).toBe('TIMEOUT_RPC_admin_dashboard_trend')
      },
    )
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('usa 30 segundos como límite por defecto', async () => {
    vi.useFakeTimers()
    expect(DEFAULT_RPC_TIMEOUT_MS).toBe(30_000)
    const nuncaResponde: Promise<{ data: unknown; error: { message: string; code?: string } | null }> = new Promise(
      () => {},
    )
    const promesa = rpcWithTimeout(nuncaResponde, 'admin_counts')
    const resultado = promesa.catch((e: unknown) => e)
    // Un milisegundo antes del límite: todavía no hay error.
    await vi.advanceTimersByTimeAsync(29_999)
    expect(await Promise.race([resultado, Promise.resolve(null)])).toBeNull()
    // Al llegar el límite: rechaza con el timeout.
    await vi.advanceTimersByTimeAsync(1)
    expect(await resultado).toBeInstanceOf(RpcTimeoutError)
  })
})
