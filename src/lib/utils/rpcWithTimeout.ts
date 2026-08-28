import type { PostgrestError } from '@supabase/supabase-js'

export const DEFAULT_RPC_TIMEOUT_MS = 30_000

/**
 * FASE 6.6 — Error de timeout de red para las RPCs del panel admin.
 *
 * Si PostgREST no responde dentro del límite (por ejemplo, el proyecto de
 * staging "se duerme" en el plan gratuito o la conexión se queda colgada),
 * la interfaz NO debe quedarse en el skeleton de carga para siempre: la
 * promesa se rechaza con este error y el panel pasa a su estado de error.
 */
export class RpcTimeoutError extends Error {
  constructor(rpcName: string) {
    super(`TIMEOUT_RPC_${rpcName}`)
    this.name = 'RpcTimeoutError'
  }
}

/**
 * FASE 6.6 — Corre la RPC en carrera contra un timeout de red.
 *
 * Si `call` responde dentro de `timeoutMs`, resuelve con el resultado de la
 * RPC (datos o error de PostgREST, igual que sin el helper). Si no responde
 * a tiempo, rechaza con `RpcTimeoutError`.
 *
 * La carrera NO cancela la petición original (el cliente de PostgREST no da
 * soporte a abortar desde aquí): solo libera a la interfaz, para que el
 * panel no quede "cargando" sin fin aunque la red no responda.
 */
export function rpcWithTimeout<TData, TError extends { message: string } = PostgrestError>(
  call: PromiseLike<{ data: TData | null; error: TError | null }>,
  rpcName: string,
  timeoutMs: number = DEFAULT_RPC_TIMEOUT_MS,
): Promise<{ data: TData | null; error: TError | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new RpcTimeoutError(rpcName)), timeoutMs)
  })
  return Promise.race([call, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}
