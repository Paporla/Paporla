import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, Package, ShieldAlert, AlertTriangle, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import PackFormSimplified from '@/components/business/PackFormSimplified'
import { logger } from '@/lib/logger'

/*
 * En Next 15+ los params de las rutas dinamicas son una Promise y hay que
 * await-earlos. Declararlos como objeto plano hace que la desestructuracion
 * devuelva undefined, se consulte get_my_pack(undefined) y la pagina caiga en
 * notFound(). Mismo contrato que src/app/(public)/packs/[id]/page.tsx.
 */
interface EditPackPageProps {
  params: Promise<{ id: string }>
}

/*
 * Fila completa de packs, tal y como la devuelve get_my_pack() (migracion 0023).
 * Nombres del esquema actual: price_minor, pickup_start_at, image_path, status.
 * No confundir con los price_cents / pickup_date / is_active del formulario,
 * que son del esquema anterior y se traducen mas abajo en toFormPack().
 */
interface PackRow {
  id: string
  shop_id: string
  title: string
  description: string | null
  category: string
  price_minor: number
  original_price_minor: number | null
  total_stock: number
  remaining_stock: number
  pickup_start_at: string
  pickup_end_at: string
  sales_start_at: string | null
  image_path: string | null
  status: string
  archived_at: string | null
}

/*
 * Los packs se crean con el desfase fijo de Chile (-04:00), igual que hace
 * PackFormSimplified al llamar a create_pack_draft. Se replica aqui para que
 * la hora que se guardo sea exactamente la que se ve al reabrir el formulario.
 * DEUDA: cuando haya mas de un mercado, esto debe salir de packs.timezone_snapshot.
 */
const CHILE_OFFSET_MINUTES = -240

function toChileDateTime(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + CHILE_OFFSET_MINUTES * 60000)
  const asIso = shifted.toISOString()
  return { date: asIso.slice(0, 10), time: asIso.slice(11, 16) }
}

/*
 * Traduce la fila real de la base de datos al contrato que hoy espera
 * PackFormSimplified. Es un adaptador temporal: en el paso 2 el formulario
 * pasara a hablar el esquema nuevo y esta funcion desaparece.
 */
function toFormPack(row: PackRow) {
  const start = toChileDateTime(row.pickup_start_at)
  const end = toChileDateTime(row.pickup_end_at)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_cents: row.price_minor,
    original_price_cents: row.original_price_minor,
    total_stock: row.total_stock,
    remaining_stock: row.remaining_stock,
    pickup_date: start.date,
    pickup_start_time: start.time,
    pickup_end_time: end.time,
    starts_at: row.sales_start_at,
    ends_at: row.pickup_end_at,
    image_url: row.image_path,
    is_active: row.status === 'active',
    status: row.status,
  }
}

export default async function EditPackPage({ params }: EditPackPageProps) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    logger.error('EditPackPage getProfile', profileError)
    redirect('/login')
  }

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'comercio') {
    if (profile.role === 'admin' || profile.role === 'super_admin') {
      redirect('/admin')
    }

    redirect('/dashboard')
  }

  /*
   * El comercio se pide con get_my_shop(), no con .from('shops').
   *
   * La migracion 0012 hace REVOKE ALL ON ALL TABLES FROM authenticated: en este
   * proyecto el cliente no lee tablas directamente, todo pasa por funciones
   * SECURITY DEFINER. Consultar la tabla devolvia 42501 'permission denied for
   * table shops', el catch redirigia a /business/profile y la pantalla de
   * edicion era inalcanzable. Dar GRANT sobre shops habria roto el modelo de
   * seguridad del proyecto entero para arreglar una sola pagina.
   */
  const { data: myShop, error: shopError } = await supabase.rpc('get_my_shop')

  if (shopError) {
    logger.error('EditPackPage getShop', shopError)
    redirect('/business/profile')
  }

  const shop = (myShop as { shop?: { id: string; name: string; status: string } } | null)?.shop ?? null

  if (!shop) {
    redirect('/business/profile')
  }

  /*
   * El estado del comercio vive en `status`, no en las columnas `verified` y
   * `banned` del esquema anterior a la migracion: esas columnas ya no existen
   * y pedirlas hacia fallar la consulta entera, redirigiendo al perfil sin
   * explicacion. Los estados validos son:
   * draft | pending_review | verified | rejected | suspended | closed
   */
  if (shop.status === 'suspended' || shop.status === 'closed') {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-red-500/10 via-transparent to-red-500/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <div className="relative">
            <Link
              href="/business/packs"
              className="inline-flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a packs
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">
                  Comercio suspendido
                </h1>
                <p className="dark:text-gray-400 text-gray-600 max-w-2xl">
                  Tu comercio esta suspendido temporalmente. No puedes editar packs en este momento. Contacta con
                  soporte si crees que se trata de un error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /*
   * El pack se pide con get_my_pack() (migracion 0023) por el mismo motivo que
   * el comercio: la tabla packs tampoco tiene GRANT para `authenticated`.
   *
   * No se usa list_my_packs porque solo devuelve las 12 columnas del listado.
   * El formulario necesita la fila completa (description, category, tags,
   * allergen_notice, original_price_minor, sales_start_at...): con las 12 se
   * abriria con campos vacios y al guardar los borraria.
   *
   * get_my_pack ya comprueba la propiedad (s.owner_id = auth.uid()), asi que
   * hace de filtro de autorizacion ademas de fuente de datos: si el pack es de
   * otro comercio devuelve NULL, no un error.
   */
  const { data: packPayload, error: packError } = await supabase.rpc('get_my_pack', {
    p_pack_id: id,
  })

  if (packError) {
    logger.error('EditPackPage getPack', { packId: id, error: packError })
    notFound()
  }

  const row = (packPayload as PackRow | null) ?? null

  if (!row) {
    // Sin error de PostgREST pero sin fila: o el uuid no existe, o el pack es
    // de otro comercio. Se registra el id para poder distinguirlo en los logs.
    logger.error('EditPackPage packNotFound', { packId: id, shopId: shop.id })
    notFound()
  }

  const pack = toFormPack(row)

  /*
   * update_pack_content (0009) exige que el pack este en draft o paused; con
   * cualquier otro estado lanza P0001 PACK_MUST_BE_DRAFT_OR_PAUSED. Se refleja
   * aqui para no ofrecer un formulario que la base de datos va a rechazar.
   */
  const isEditable = row.status === 'draft' || row.status === 'paused'
  const isFinalStatus = row.status === 'sold_out' || row.status === 'expired' || row.status === 'archived'

  if (shop.status !== 'verified') {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-transparent to-primary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <div className="relative">
            <Link
              href="/business/packs"
              className="inline-flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a packs
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-yellow-400" />
              </div>

              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">
                  Verificacion pendiente
                </h1>

                <p className="dark:text-gray-400 text-gray-600 max-w-2xl mb-6">
                  Tu comercio todavia no esta verificado. Puedes editar informacion basica, pero no podras publicar
                  packs activos hasta que el administrador apruebe tu comercio.
                </p>

                <Link href="/business/profile">
                  <Button variant="outline">Ir al perfil del comercio</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <PackFormSimplified shopId={shop.id} pack={pack} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <Link
            href="/business/packs"
            className="inline-flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a packs
          </Link>

          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Editar pack</h1>
                  <p className="dark:text-gray-400 text-gray-600 mt-1">Modifica la informacion de tu pack</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Estado: <span className="ml-1 dark:text-white text-gray-900 font-medium">{row.status}</span>
                </span>

                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Stock:{' '}
                  <span className="ml-1 dark:text-white text-gray-900 font-medium">
                    {row.remaining_stock}/{row.total_stock}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Comercio: <span className="ml-1 dark:text-white text-gray-900 font-medium">{shop.name}</span>
                </span>
              </div>
            </div>

            <Link href={`/business/packs/${id}/duplicate`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Duplicar pack
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {isFinalStatus && (
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />

            <div>
              <h2 className="text-sm font-semibold text-yellow-200">Este pack tiene un estado final</h2>

              <p className="text-sm text-yellow-100/70 mt-1">
                Este pack esta marcado como <span className="font-medium">{row.status}</span>. Puedes revisar o duplicar
                la informacion, pero para nuevas ventas lo mas recomendable es duplicarlo y publicar un pack nuevo.
              </p>
            </div>
          </div>
        </div>
      )}

      {isEditable ? (
        <div className="max-w-4xl mx-auto">
          <PackFormSimplified shopId={shop.id} pack={pack} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 flex gap-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                {row.status === 'active' ? 'Pausa el pack para poder editarlo' : 'Este pack ya no se puede editar'}
              </h2>

              <p className="text-sm dark:text-gray-400 text-gray-600 mt-2 max-w-2xl">
                {row.status === 'active'
                  ? 'Un pack publicado no se puede modificar mientras esta a la venta: alguien podria estar reservandolo en este momento. Ponlo en pausa desde el listado de packs y vuelve aqui para editarlo.'
                  : 'Solo los packs en borrador o en pausa admiten cambios. Duplica este pack para crear uno nuevo con la misma informacion.'}
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                <Link href="/business/packs">
                  <Button variant="outline">Ir al listado de packs</Button>
                </Link>

                <Link href={`/business/packs/${id}/duplicate`}>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicar pack
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
