import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * API de reservas del USUARIO.
 *
 * Solo dos operaciones, y las dos son finas:
 *   GET → list_my_reservations (0014:281), la vista canónica del usuario
 *         (paginada por cursor created_at + id).
 *   PUT → cancel_reservation (0009:366), que reintegra stock, actualiza
 *         las stats y mapea la acción de pago.
 *
 * Lo que NO hay aquí, y por qué:
 *   - POST: crear reserva ya no pasa por el servidor. El cliente llama
 *     directo al RPC create_payment_reservation vía useCreateReservation
 *     (fase 3.1), porque la idempotencia vive en el cliente.
 *   - validate_pickup: es una acción del COMERCIO (0009:~503, parámetro
 *     p_credential). Se conecta en la fase 4 en el panel business.
 *   - GET ?id=: la vista lista ya devuelve todo lo que el usuario puede
 *     ver. El acceso directo a la tabla reservations no tiene GRANT para
 *     usuarios (está prohibido por diseño, ver 0012_permissions.sql).
 */

async function authenticateUser() {
  const supabase = await createClient()
  // Verificar sesión primero para evitar AuthSessionMissingError
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET(request: Request) {
  const user = await authenticateUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  // Cursor (created_at, id) para paginar hacia atrás; la primera página no trae nada.
  const beforeCreatedAt = searchParams.get('beforeCreatedAt')
  const beforeId = searchParams.get('beforeId')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_my_reservations', {
    p_before_created_at: beforeCreatedAt ?? null,
    p_before_reservation_id: beforeId ?? null,
    p_limit: 50,
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: translateDbError(error, 'No se pudieron cargar tus reservas.') },
      { status: 400 },
    )
  }

  // PostgREST serializa bigint como string; la UI necesita number.
  const reservations = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    total_amount_minor: Number(row.total_amount_minor ?? 0),
    cancel_reason: (row.cancel_reason as string | null) ?? null,
  }))

  return NextResponse.json({ success: true, reservations })
}

export async function PUT(request: Request) {
  const user = await authenticateUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const reason = typeof body.cancel_reason === 'string' ? body.cancel_reason.trim() : ''

  if (!id) {
    return NextResponse.json({ success: false, error: 'Falta el identificador de la reserva.' }, { status: 400 })
  }
  // Espejo del chequeo de la base (length(btrim(p_reason)) >= 3): es mejor
  // fallar antes, sin gastar el RPC, con un mensaje claro.
  if (reason.length < 3) {
    return NextResponse.json(
      { success: false, error: 'Indica un motivo de al menos 3 letras para cancelar.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: id,
    p_cancel_reason: reason,
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: translateDbError(error, 'No se pudo cancelar la reserva.') },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true, message: 'Reserva cancelada' })
}
