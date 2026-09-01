import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * Cron: transiciones de ciclo de vida que dependen del paso del tiempo.
 * Ejecuta en orden las cuatro RPCs `service_*` de 0009/0036 que ningún otro
 * cron llamaba (las reservas se quedaban en `ready_pickup` para siempre y los
 * packs vencidos seguían como `active` en el panel del comercio):
 *
 *   1. service_open_pickup_windows — confirmed+paid → ready_pickup al abrir la
 *      ventana. En el piloto es un no-op (confirm_shop_reservation ya deja la
 *      reserva en ready_pickup), pero queda listo para la fase de pagos.
 *   2. service_mark_no_shows — confirmed/ready_pickup+paid cuya ventana
 *      terminó → no_show, con penalización según la política del mercado.
 *   3. service_complete_picked_up_reservations — picked_up → completed
 *      pasadas 24 h (cierre contable del histórico).
 *   4. service_expire_packs — packs active/paused/sold_out cuya ventana de
 *      retiro terminó → expired (0036).
 *
 * El orden importa: primero se resuelven las reservas de la ventana que acaba
 * de cerrar y después se expira el pack.
 *
 * Cada paso es independiente: si una RPC falla se registra y se continúa con
 * las demás (un fallo puntual no debe frenar el resto del ciclo de vida). La
 * respuesta es 500 si falló alguna, con el detalle por paso.
 *
 * Frecuencia recomendada: cada 15 minutos.
 * Auth: header `Authorization: Bearer $CRON_SECRET` (validateCronRequest).
 */

const STEPS = [
  'service_open_pickup_windows',
  'service_mark_no_shows',
  'service_complete_picked_up_reservations',
  'service_expire_packs',
] as const

type StepName = (typeof STEPS)[number]

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const results: Record<StepName, { processed: number } | { error: string }> = {} as never
  let failed = false

  for (const step of STEPS) {
    try {
      const { data, error } = await supabase.rpc(step)
      if (error) throw error

      const rpcResult = data as { success?: boolean; processed?: number } | null
      results[step] = { processed: rpcResult?.processed ?? 0 }
    } catch (error) {
      logger.error(`CRON lifecycle ${step}`, error)
      results[step] = { error: error instanceof Error ? error.message : 'Error desconocido' }
      failed = true
    }
  }

  return NextResponse.json(
    {
      success: !failed,
      results,
      timestamp: new Date().toISOString(),
    },
    { status: failed ? 500 : 200 },
  )
}
