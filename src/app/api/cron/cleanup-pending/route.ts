import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: result, error } = await supabase.rpc('cleanup_pending_reservations', {
      p_minutes_ago: 30,
    })

    if (error) {
      logger.error('CRON cleanup-pending RPC', error)
      throw error
    }

    const rpcResult = result as { success?: boolean; cleaned_count?: number }
    const cleaned = rpcResult?.cleaned_count ?? 0

    return NextResponse.json({
      success: true,
      cleaned,
      message: `Se eliminaron ${cleaned} reservas pendientes expiradas`,
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
