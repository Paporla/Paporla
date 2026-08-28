import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * Cron: expira los holds de pago (reservas `payment_pending` cuyo
 * `checkout_hold_expires_at` ya pasó) sobre la RPC canónica
 * `service_expire_payment_holds` (0009). La RPC expira la reserva, devuelve el
 * stock al pack y emite el evento `reservation.payment_hold_expired`.
 *
 * Fase 7: la versión anterior llamaba a `cleanup_pending_reservations`, una RPC
 * que NO existe en el esquema canónico (quedaba rota al primer crón).
 *
 * Frecuencia recomendada: cada 5 minutos (el hold de checkout dura 10 min).
 * Auth: header `Authorization: Bearer $CRON_SECRET` (validateCronRequest).
 */
export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: result, error } = await supabase.rpc('service_expire_payment_holds')

    if (error) {
      logger.error('CRON cleanup-pending RPC', error)
      throw error
    }

    const rpcResult = result as { success?: boolean; processed?: number } | null
    const expired = rpcResult?.processed ?? 0

    return NextResponse.json({
      success: true,
      expired,
      message: `Se expiraron ${expired} holds de pago (reservas payment_pending caducadas)`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('CRON cleanup-pending', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
