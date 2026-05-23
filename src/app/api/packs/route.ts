import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPacks, createPack, updatePack, deletePack, ALLOWED_PACK_FIELDS } from '@/lib/services/packService'
import { packSchema } from '@/lib/utils/validations'

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

interface PackResult {
  error?: string
  status?: number
  data?: unknown
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const result = (await getPacks(
    searchParams.get('id') || undefined,
    searchParams.get('shopId') || undefined,
  )) as PackResult
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 })
  if (searchParams.get('id')) return NextResponse.json({ success: true, pack: result.data }, { headers: cacheHeaders })
  return NextResponse.json({ success: true, packs: result.data }, { headers: cacheHeaders })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = packSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || 'Datos inválidos'
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const result = (await createPack(user.id, body)) as PackResult
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 })
  return NextResponse.json({ success: true, pack: result.data }, { status: result.status || 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ success: false, error: 'ID del pack requerido' }, { status: 400 })
  }

  const filteredBody: Record<string, unknown> = { id: body.id }
  for (const key of ALLOWED_PACK_FIELDS) {
    if (key in body) filteredBody[key] = body[key]
  }

  const updateResult = (await updatePack(user.id, filteredBody)) as PackResult
  if (updateResult.error)
    return NextResponse.json({ success: false, error: updateResult.error }, { status: updateResult.status || 500 })
  return NextResponse.json({ success: true, pack: updateResult.data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'ID del pack requerido' }, { status: 400 })

  const deleteResult = (await deletePack(user.id, id)) as PackResult & { data?: { success: boolean } }
  if (deleteResult.error)
    return NextResponse.json({ success: false, error: deleteResult.error }, { status: deleteResult.status || 500 })
  return NextResponse.json({ success: true, message: 'Pack eliminado' })
}
