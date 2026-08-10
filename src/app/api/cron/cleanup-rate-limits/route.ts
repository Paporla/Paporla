import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.rpc('cleanup_rate_limits')

    if (error) {
      console.error('[CRON:cleanup-rate-limits] Error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Rate limits expirados limpiados correctamente',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON:cleanup-rate-limits] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
