import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: expireResult, error: expireError } = await supabase.rpc('expire_reservations')

    if (expireError) {
      console.error('[CRON] RPC Error:', expireError)
      throw expireError
    }

    const result = expireResult as { expired_reservations?: number; expired_packs?: number; sold_out_packs?: number }

    return NextResponse.json({
      success: true,
      expired_reservations: result?.expired_reservations ?? 0,
      expired_packs: result?.expired_packs ?? 0,
      sold_out_packs: result?.sold_out_packs ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
