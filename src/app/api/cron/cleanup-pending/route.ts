import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: result, error } = await supabase.rpc('cleanup_pending_reservations', {
      minutes_ago: 30,
    })

    if (error) {
      console.error('[CRON:cleanup-pending] RPC Error:', error)
      throw error
    }

    const cleaned = (result as { cleaned?: number })?.cleaned ?? 0

    return NextResponse.json({
      success: true,
      cleaned,
      message: `Se eliminaron ${cleaned} reservas pendientes expiradas`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON:cleanup-pending] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
