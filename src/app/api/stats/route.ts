import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface CommunityStats {
  packsRescued: number
  moneySavedMinor: number
  currencyCode: string
  co2SavedKg: number
  activeShops: number
  activePacks: number
}

/**
 * Fase 8: las métricas de la comunidad salen de la RPC canónica
 * community_stats (0035, SECURITY DEFINER, GRANT anon) — los .from() legacy a
 * reservations/shops/packs los negaba el esquema 0012 (42501) y la landing
 * vivía siempre del fallback de la FAO. La RPC solo devuelve agregados:
 * ninguna fila de negocio viaja al cliente.
 *
 * CO2: 2.5 kg por pack rescatado (estimación conservadora, FAO) — se calcula
 * aquí para no mezclar física con SQL.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('community_stats')

    if (error) {
      throw error
    }

    const stats = data as {
      packs_rescued: number
      money_saved_minor: number
      currency_code: string
      active_shops: number
      active_packs: number
    } | null

    const packsRescued = stats?.packs_rescued ?? 0

    return NextResponse.json({
      success: true,
      stats: {
        packsRescued,
        moneySavedMinor: stats?.money_saved_minor ?? 0,
        currencyCode: stats?.currency_code ?? 'CLP',
        co2SavedKg: packsRescued * 2.5,
        activeShops: stats?.active_shops ?? 0,
        activePacks: stats?.active_packs ?? 0,
      } satisfies CommunityStats,
    })
  } catch (error) {
    logger.error('Stats API', error)
    return NextResponse.json({ success: false, error: 'Error obteniendo estadísticas' }, { status: 500 })
  }
}
