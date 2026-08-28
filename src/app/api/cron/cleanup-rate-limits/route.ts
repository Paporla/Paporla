import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * Cron: limpia las filas expiradas de `rate_limits` sobre la RPC canónica
 * `service_cleanup_rate_limits` (0009).
 *
 * Fase 7: la versión anterior llamaba a `cleanup_rate_limits`, una RPC que NO
 * existe en el esquema canónico (quedaba rota al primer crón).
 *
 * Frecuencia recomendada: diaria (las filas de rate limit viven minutos/horas).
 * Auth: header `Authorization: Bearer $CRON_SECRET` (validateCronRequest).
 */
export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: result, error } = await supabase.rpc('service_cleanup_rate_limits')

    if (error) {
      logger.error('CRON cleanup-rate-limits RPC', error)
      throw error
    }

    const rpcResult = result as { success?: boolean; processed?: number } | null
    const cleaned = rpcResult?.processed ?? 0

    return NextResponse.json({
      success: true,
      cleaned,
      message: `Se limpiaron ${cleaned} rate limits expirados`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('CRON cleanup-rate-limits', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
