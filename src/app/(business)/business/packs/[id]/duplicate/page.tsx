import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy } from 'lucide-react'
import PackFormSimplified from '@/components/business/PackFormSimplified'
import { toFormPack, type PackRow } from '@/lib/utils/packRow'
import { logger } from '@/lib/logger'

/*
 * En Next 15+ los params de las rutas dinamicas son una Promise y hay que
 * await-earlos. Mismo contrato que la pantalla de edicion.
 */
interface DuplicatePackPageProps {
  params: Promise<{ id: string }>
}

export default async function DuplicatePackPage({ params }: DuplicatePackPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /*
   * El comercio se pide con get_my_shop(), no con .from('shops').
   *
   * Esta pagina leia .from('shops') y .from('packs') directamente. La migracion
   * 0012 hace REVOKE ALL ON ALL TABLES FROM authenticated: en este proyecto el
   * cliente no lee tablas, lee funciones SECURITY DEFINER. Las dos consultas
   * devolvian 42501 'permission denied', el shop salia null y la pagina
   * redirigia a /business/profile: duplicar era inalcanzable. Es el mismo fallo
   * que ya se corrigio en la pantalla de edicion con la migracion 0023.
   */
  const { data: myShop, error: shopError } = await supabase.rpc('get_my_shop')

  if (shopError) {
    logger.error('DuplicatePackPage getShop', shopError)
    redirect('/business/profile')
  }

  const shop =
    (
      myShop as {
        shop?: { id: string; name: string; status: string; default_pack_image_path?: string | null }
      } | null
    )?.shop ?? null

  if (!shop) {
    redirect('/business/profile')
  }

  /*
   * get_my_pack ya comprueba la propiedad (s.owner_id = auth.uid()), asi que
   * hace de filtro de autorizacion ademas de fuente de datos: si el pack es de
   * otro comercio devuelve NULL, no un error. No hace falta filtrar por shop_id.
   */
  const { data: packPayload, error: packError } = await supabase.rpc('get_my_pack', {
    p_pack_id: id,
  })

  if (packError) {
    logger.error('DuplicatePackPage getPack', { packId: id, error: packError })
    notFound()
  }

  const row = (packPayload as PackRow | null) ?? null

  if (!row) {
    logger.error('DuplicatePackPage packNotFound', { packId: id, shopId: shop.id })
    notFound()
  }

  /*
   * El bucket pack-images es publico (0013_storage.sql), asi que basta con
   * getPublicUrl: packs.image_path guarda una ruta relativa, no una URL.
   */
  const imageUrl = row.image_path
    ? supabase.storage.from('pack-images').getPublicUrl(row.image_path).data.publicUrl
    : null

  const pack = toFormPack(row, imageUrl)

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

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Copy className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Duplicar pack</h1>
              <p className="dark:text-gray-400 text-gray-600 mt-1">
                Copia de &ldquo;{row.title}&rdquo;. Se creara como borrador nuevo.
              </p>
            </div>
          </div>

          <p className="text-sm dark:text-gray-400 text-gray-600 max-w-2xl mt-4">
            Revisa la fecha de recogida antes de guardar: debe estar en el futuro. La foto no se copia, subela de nuevo
            si la necesitas.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <PackFormSimplified
          shopId={shop.id}
          pack={pack}
          isDuplicate
          shopStatus={shop.status}
          shopImagePath={shop.default_pack_image_path}
        />
      </div>
    </div>
  )
}
