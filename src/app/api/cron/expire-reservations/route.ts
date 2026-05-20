import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function validateRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  return authHeader === 'Bearer ' + cronSecret
}

export async function GET(request: Request) {
  try {
    if (!validateRequest(request)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: expireResult, error: expireError } = await supabase.rpc('expire_reservations')

    if (expireError) {
      console.error('[CRON] RPC Error:', expireError)
      throw expireError
    }

    const result = expireResult as any

    return NextResponse.json({
      success: true,
      expired_reservations: result.expired_reservations || 0,
      expired_packs: result.expired_packs || 0,
      sold_out_packs: result.sold_out_packs || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
