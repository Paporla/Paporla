import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function validateCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  return authHeader === 'Bearer ' + cronSecret
}

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: result, error } = await supabase.rpc('cleanup_pending_reservations', {
      minutes_ago: 30,
    })

    if (error) {
      console.error('[CRON:cleanup-pending] RPC Error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      cleaned: (result as any)?.cleaned || 0,
      message: `Se eliminaron ${(result as any)?.cleaned || 0} reservas pendientes expiradas`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON:cleanup-pending] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
