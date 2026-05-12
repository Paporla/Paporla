import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPacks, createPack, updatePack, deletePack } from '@/lib/services/packService'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const result = await getPacks(searchParams.get('id') || undefined, searchParams.get('shopId') || undefined)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  if (searchParams.get('id')) return NextResponse.json({ pack: result.data })
  return NextResponse.json({ packs: result.data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const result = await createPack(user.id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ pack: result.data }, { status: result.status || 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const result = await updatePack(user.id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ pack: result.data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const result = await deletePack(user.id, id || '')
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ success: true, message: 'Pack eliminado' })
}
