import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Copy,
  Package,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import PackFormSimplified from '@/components/business/PackFormSimplified'

interface EditPackPageProps {
  params: {
    id: string
  }
}

export default async function EditPackPage({ params }: EditPackPageProps) {
  const { id } = params

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
    console.error('Error obteniendo perfil:', profileError)
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

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name, verified, banned, deleted_at')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (shopError) {
    console.error('Error obteniendo comercio:', shopError)
    redirect('/business/profile')
  }

  if (!shop) {
    redirect('/business/profile')
  }

  if (shop.deleted_at) {
    redirect('/business/profile')
  }

  if (shop.banned) {
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
                  Tu comercio esta suspendido temporalmente. No puedes editar
                  packs en este momento. Contacta con soporte si crees que se
                  trata de un error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: pack, error: packError } = await supabase
    .from('packs')
    .select('*')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (packError) {
    console.error('Error obteniendo pack:', packError)
    notFound()
  }

  if (!pack) {
    notFound()
  }

  if (!shop.verified) {
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
                  Tu comercio todavia no esta verificado. Puedes editar
                  informacion basica, pero no podras publicar packs activos
                  hasta que el administrador apruebe tu comercio.
                </p>

                <Link href="/business/profile">
                  <Button variant="outline">
                    Ir al perfil del comercio
                  </Button>
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

  const isFinalStatus =
    pack.status === 'sold_out' ||
    pack.status === 'expired' ||
    pack.status === 'deleted'

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
                  <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">
                    Editar pack
                  </h1>
                  <p className="dark:text-gray-400 text-gray-600 mt-1">
                    Modifica la informacion de tu pack
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Estado:{' '}
                  <span className="ml-1 dark:text-white text-gray-900 font-medium">
                    {pack.status || 'active'}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Stock:{' '}
                  <span className="ml-1 dark:text-white text-gray-900 font-medium">
                    {pack.remaining_stock}/{pack.total_stock}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-100 px-3 py-1 text-xs dark:text-gray-300 text-gray-700">
                  Comercio:{' '}
                  <span className="ml-1 dark:text-white text-gray-900 font-medium">
                    {shop.name}
                  </span>
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
              <h2 className="text-sm font-semibold text-yellow-200">
                Este pack tiene un estado final
              </h2>

              <p className="text-sm text-yellow-100/70 mt-1">
                Este pack está marcado como{' '}
                <span className="font-medium">{pack.status}</span>. Puedes
                revisar o duplicar la información, pero para nuevas ventas lo
                más recomendable es duplicarlo y publicar un pack nuevo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <PackFormSimplified shopId={shop.id} pack={pack} />
      </div>
    </div>
  )
}