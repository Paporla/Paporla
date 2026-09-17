import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// ============================================================================
// Zona horaria: la de la reserva, no la de Chile
// ============================================================================
// Antes esto decía `const TZ_SANTIAGO = 'America/Santiago'` y se usaba para
// todo. Con una sola comuna funcionaba, pero Paporla quiere crecer a otras
// comunas y otros países, y cada reserva guarda ya SU zona horaria en
// `timezone_snapshot` (la misma que tenía el pack al reservarse).
//
// Ahora cada aviso se calcula en la zona horaria de SU reserva. Si mañana hay
// una reserva en Buenos Aires, su aviso dirá la hora de Buenos Aires.
//
// Esta constante ya NO es "la hora de Chile": es SOLO el recurso cuando una
// reserva no trae zona horaria (datos viejos, o un nulo inesperado). Preferimos
// mandar el aviso con una hora aproximada antes que no mandarlo.
// ============================================================================
const TZ_REEMPLAZO = 'America/Santiago'

// Margen amplio de consulta (2 dias). El filtro EXACTO por dia se hace en JS,
// en la zona horaria de cada reserva; este limite solo evita leer historial
// viejo innecesario.
const LOOKBACK_MS = 48 * 60 * 60 * 1000

/**
 * Comprueba que una zona horaria sirve, y si no devuelve la de reemplazo.
 *
 * `Intl.DateTimeFormat` LANZA un RangeError si la zona no existe. Sin esta
 * comprobación, una sola fila con la zona horaria mal grabada tumbaría el crón
 * entero y nadie recibiría su aviso.
 */
function zonaHorariaSegura(tz: unknown): string {
  if (typeof tz !== 'string' || tz.trim() === '') return TZ_REEMPLAZO

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return tz
  } catch {
    // Ojo con la firma del logger: (contexto, mensaje, meta). Con dos
    // argumentos TypeScript se queja, y con razón.
    logger.warn('CRON pickup-reminders', 'Zona horaria inválida, se usa la de reemplazo', {
      recibida: tz,
    })
    return TZ_REEMPLAZO
  }
}

/** Fecha YYYY-MM-DD de un instante, en la zona horaria que le pases. */
function fechaLocal(instante: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}

/** Ventana de recogida "HH:MM–HH:MM" en la zona horaria indicada (24 h). */
function formatearVentana(startIso: string, endIso: string, tz: string): string {
  const fmt = new Intl.DateTimeFormat('es-CL', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${fmt.format(new Date(startIso))}–${fmt.format(new Date(endIso))}`
}

/** `notifications.title` tiene tope de 160 chars (0006); acota el nombre del pack. */
function shortTitle(title: string, max = 120): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
}

/**
 * Cron: recordatorios de recogida de HOY.
 *
 * "Hoy" se mira en la zona horaria de CADA reserva, no en la de Chile: el crón
 * corre una vez y en ese instante puede ser otro día en otro país. Una reserva
 * en Santiago es "de hoy" cuando es ese día en Santiago; una de Buenos Aires,
 * cuando lo es en Buenos Aires.
 *
 * Crea notificaciones in-app (tabla `notifications`, esquema canónico 0006)
 * para el cliente (category 'pickup') y para el dueño del comercio
 * (category 'shop_operations'), ambas deduplicadas por reserva +
 * destinatario en las últimas 24 h (el cron puede correr 2 veces al día).
 *
 * Fase 7: la versión anterior leía columnas que no existen en el esquema
 * canónico (`pickup_date`, `pickup_start_time`, join de packs/shops) e
 * insertaba campos muerta (`message`, `is_read`, `sent_at`), así que
 * quedaba rota al primer crón. Tampoco envía correos: en el piloto el
 * aviso llega al inbox in-app, que el cliente ya ve al entrar a la app.
 *
 * Frecuencia recomendada: una vez al día, por la mañana.
 * Auth: header `Authorization: Bearer $CRON_SECRET` (validateCronRequest).
 */
export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(
        'id, user_id, shop_id, pack_id, status, pickup_start_at, pickup_end_at, timezone_snapshot, pack_title_snapshot, shop_name_snapshot',
      )
      .in('status', ['confirmed', 'ready_pickup'])
      .gte('pickup_start_at', new Date(now.getTime() - LOOKBACK_MS).toISOString())
      .order('pickup_start_at', { ascending: true })
      .limit(200)

    if (error) {
      logger.error('CRON pickup-reminders query', error)
      throw error
    }

    // Cada reserva se compara con "hoy" en SU propia zona horaria.
    const todays = (reservations ?? []).filter((r: Record<string, unknown>) => {
      const tz = zonaHorariaSegura(r.timezone_snapshot)
      return fechaLocal(new Date(r.pickup_start_at as string), tz) === fechaLocal(now, tz)
    })

    if (todays.length === 0) {
      return NextResponse.json({
        success: true,
        user_reminders: 0,
        shop_reminders: 0,
        message: 'Sin recogidas para hoy',
        timestamp: now.toISOString(),
      })
    }

    const shopIds = [...new Set(todays.map((r: Record<string, unknown>) => r.shop_id as string))]
    const { data: shops, error: shopsError } = await supabase.from('shops').select('id, owner_id').in('id', shopIds)

    if (shopsError) {
      logger.error('CRON pickup-reminders shops', shopsError)
      throw shopsError
    }

    const ownerByShop = new Map<string, string | null>(
      (shops ?? []).map((s: { id: string; owner_id: string | null }) => [s.id, s.owner_id]),
    )

    // Dedupe: si en las últimas 24 h ya se avisó de esta reserva a este
    // destinatario, no se repite.
    const dedupeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const hasRecentReminder = async (userId: string, reservationId: string): Promise<boolean> => {
      const { data: existing, error: dedupeError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'pickup_reminder')
        .eq('reservation_id', reservationId)
        .gte('created_at', dedupeSince)
        .maybeSingle()

      if (dedupeError) {
        logger.error('CRON pickup-reminders dedupe', dedupeError)
        return false
      }
      return existing !== null
    }

    let userReminders = 0
    let shopReminders = 0

    for (const row of todays) {
      const r = row as {
        id: string
        user_id: string
        shop_id: string
        pack_id: string
        pickup_start_at: string
        pickup_end_at: string
        timezone_snapshot: string | null
        pack_title_snapshot: string
        shop_name_snapshot: string
      }

      // La hora se muestra en la zona horaria de ESTA reserva, así que lo
      // honesto es decir "hora local": vale igual en Chile que en cualquier
      // otro mercado al que lleguemos.
      const tz = zonaHorariaSegura(r.timezone_snapshot)
      const window = formatearVentana(r.pickup_start_at, r.pickup_end_at, tz)
      const packTitle = r.pack_title_snapshot
      const shopName = r.shop_name_snapshot
      const ownerId = ownerByShop.get(r.shop_id) ?? null

      // --- Recordatorio al cliente ----------------------------------------
      if (!(await hasRecentReminder(r.user_id, r.id))) {
        const { error: insertError } = await supabase.from('notifications').insert({
          user_id: r.user_id,
          category: 'pickup',
          type: 'pickup_reminder',
          title: `Tu recogida de hoy: ${shortTitle(packTitle)}`,
          body: `Hoy recoges "${packTitle}" en ${shopName} (${window}, hora local).`,
          data: {
            reservation_id: r.id,
            pickup_start_at: r.pickup_start_at,
            pickup_end_at: r.pickup_end_at,
          },
          reservation_id: r.id,
          shop_id: r.shop_id,
          pack_id: r.pack_id,
        })

        if (insertError) {
          logger.error('CRON pickup-reminders insert cliente', insertError)
        } else {
          userReminders += 1
        }
      }

      // --- Recordatorio al comercio (owner de la tienda) -------------------
      if (ownerId && !(await hasRecentReminder(ownerId, r.id))) {
        const { error: insertError } = await supabase.from('notifications').insert({
          user_id: ownerId,
          category: 'shop_operations',
          type: 'pickup_reminder',
          title: `Recogida de hoy: ${shortTitle(packTitle)}`,
          body: `Un cliente recogerá "${packTitle}" hoy (${window}, hora local).`,
          data: {
            reservation_id: r.id,
            pickup_start_at: r.pickup_start_at,
            pickup_end_at: r.pickup_end_at,
          },
          reservation_id: r.id,
          shop_id: r.shop_id,
          pack_id: r.pack_id,
        })

        if (insertError) {
          logger.error('CRON pickup-reminders insert comercio', insertError)
        } else {
          shopReminders += 1
        }
      }
    }

    return NextResponse.json({
      success: true,
      user_reminders: userReminders,
      shop_reminders: shopReminders,
      message: `Recordatorios de hoy: ${userReminders} para clientes, ${shopReminders} para comercios`,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    logger.error('CRON pickup-reminders', err)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
