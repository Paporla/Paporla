import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PackagePlus, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import PackFormSimplified from '@/components/business/PackFormSimplified'

export default async function NewPackPage() {
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
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a packs
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Comercio suspendido
                </h1>
                <p className="text-gray-400 max-w-2xl">
                  Tu comercio esta suspendido temporalmente. No puedes crear
                  nuevos packs en este momento. Contacta con soporte si crees
                  que se trata de un error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (shop.verified !== true) {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-transparent to-primary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
          <div className="relative">
            <Link
              href="/business/packs"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a packs
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-yellow-400" />
              </div>

              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Verificacion pendiente
                </h1>

                <p className="text-gray-400 max-w-2xl mb-6">
                  Tu comercio todavia no esta verificado. Puedes completar o
                  revisar la informacion de tu perfil mientras esperas la
                  aprobacion. Cuando el administrador verifique tu comercio,
                  podras publicar packs.
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
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <Link
            href="/business/packs"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a packs
          </Link>

          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5 text-primary" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Crear nuevo pack
                </h1>
              </div>

              <p className="text-gray-400 max-w-2xl">
                Publica un pack sorpresa para que los usuarios puedan
                reservarlo y recogerlo dentro del horario establecido.
              </p>
            </div>

            <div className="text-sm text-gray-400 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              Comercio:{' '}
              <span className="text-white font-medium">
                {shop.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <PackFormSimplified shopId={shop.id} />
      </div>
    </div>
  )
}
