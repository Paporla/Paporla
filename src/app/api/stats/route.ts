import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface CommunityStats {
  packsRescued: number
  moneySavedCents: number
  co2SavedKg: number
  activeShops: number
  activePacks: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Packs rescatados (reservas recogidas)
    const { count: packsRescued } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'picked_up')

    // Dinero ahorrado (precio original - precio pagado en packs recogidos)
    const { data: savings } = await supabase
      .from('reservations')
      .select('total_price_cents, pack:packs(price_cents, original_price_cents)')
      .eq('status', 'picked_up')
      .limit(5000)

    let moneySavedCents = 0
    if (savings) {
      for (const r of savings) {
        const packArray = r.pack as { price_cents: number; original_price_cents: number | null }[] | null
        const pack = (Array.isArray(packArray) ? packArray[0] : packArray) ?? null
        if (pack?.original_price_cents && pack.original_price_cents > pack.price_cents) {
          moneySavedCents +=
            (pack.original_price_cents - pack.price_cents) * ((r as { quantity?: number }).quantity ?? 1)
        }
      }
    }

    // CO2 ahorrado (~2.5 kg por pack rescatado, estimación conservadora FAO)
    const co2SavedKg = (packsRescued ?? 0) * 2.5

    // Comercios activos
    const { count: activeShops } = await supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)
      .is('deleted_at', null)

    // Packs activos
    const { count: activePacks } = await supabase
      .from('packs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null)

    return NextResponse.json({
      success: true,
      stats: {
        packsRescued: packsRescued ?? 0,
        moneySavedCents,
        co2SavedKg,
        activeShops: activeShops ?? 0,
        activePacks: activePacks ?? 0,
      } satisfies CommunityStats,
    })
  } catch (error) {
    logger.error('Stats API', error)
    return NextResponse.json({ success: false, error: 'Error obteniendo estadísticas' }, { status: 500 })
  }
}
