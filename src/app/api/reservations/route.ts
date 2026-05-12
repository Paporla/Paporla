import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserReservations, createReservation, updateReservation } from '@/lib/services/reservationService'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId')

  const result = await getUserReservations(user.id, shopId || undefined)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ reservations: result.data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const result = await createReservation(user.id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ reservation: result.data }, { status: result.status || 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const result = await updateReservation(user.id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ reservation: result.data })
}
