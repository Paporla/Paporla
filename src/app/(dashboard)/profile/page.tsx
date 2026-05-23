'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import { User, Mail, Phone, Award, Package, DollarSign, Leaf, LogOut } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import PageLoadingSpinner from '@/components/ui/PageLoadingSpinner'

interface UserStats {
  packsRescued: number
  moneySaved: number
  co2Avoided: string
  points: number
  level: string
  memberSince: string
}

export default function ProfilePage() {
  const { user, signOut, getUser } = useAuth()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user')

      const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        : '2024'

      const supabase = supabaseBrowser()
      const { data: rawReservations } = await supabase
        .from('reservations')
        .select('id, total_price_cents, pack_id')
        .eq('user_id', user.id)
        .eq('status', 'picked_up')

      const completed = (rawReservations || []) as { id: string; total_price_cents: number; pack_id: string }[]
      const packsRescued = completed.length
      const packIds = completed.map((r) => r.pack_id)
      const { data: packs } =
        packIds.length > 0
          ? await supabase.from('packs').select('id, original_price_cents').in('id', packIds)
          : { data: [] }
      const packPriceMap = new Map((packs || []).map((p) => [p.id, p.original_price_cents]))
      const moneySavedCents = completed.reduce((sum: number, r) => {
        const original = packPriceMap.get(r.pack_id) || r.total_price_cents
        const saved = original - r.total_price_cents
        return sum + (saved > 0 ? saved : 0)
      }, 0)
      const co2Avoided = (packsRescued * 1.2).toFixed(1)
      const points = packsRescued * 10

      let level = 'Aprendiz'
      if (points >= 500) level = 'Rescatador Elite'
      else if (points >= 200) level = 'Rescatador Pro'
      else if (points >= 50) level = 'Rescatador Avanzado'
      else if (points >= 10) level = 'Rescatador'

      return {
        packsRescued,
        moneySaved: moneySavedCents / 100,
        co2Avoided: `${co2Avoided}kg`,
        points,
        level,
        memberSince,
      } as UserStats
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user')
      const supabase = supabaseBrowser()
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ name: formData.name, phone: formData.phone })
        .eq('id', user.id)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      setSuccess('Perfil actualizado correctamente')
      getUser()
      queryClient.invalidateQueries({ queryKey: ['profile-stats', user?.id] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSave = async () => {
    setError('')
    setSuccess('')
    await updateMutation.mutateAsync()
  }

  const handleLogout = async () => {
    await signOut()
  }

  if (isLoading) {
    return <PageLoadingSpinner message="Cargando tu perfil..." />
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Mi Perfil</h1>
          </div>
          <p className="dark:text-gray-400 text-gray-600">Gestiona tu informacion personal</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card glass className="p-4 text-center">
          <Package className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold dark:text-white text-gray-900">{stats?.packsRescued || 0}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400">Packs rescatados</p>
        </Card>
        <Card glass className="p-4 text-center">
          <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold dark:text-white text-gray-900">${(stats?.moneySaved || 0).toFixed(0)}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400">Ahorrado</p>
        </Card>
        <Card glass className="p-4 text-center">
          <Leaf className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold dark:text-white text-gray-900">{stats?.co2Avoided || '0kg'}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400">CO2 evitado</p>
        </Card>
        <Card glass className="p-4 text-center">
          <Award className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold dark:text-white text-gray-900">{stats?.points || 0}</p>
          <p className="text-xs dark:text-gray-500 text-gray-400">Puntos</p>
        </Card>
      </div>

      <Card glass className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-bold dark:text-white text-gray-900">Nivel {stats?.level || 'Aprendiz'}</h3>
          </div>
          <span className="text-xs dark:text-gray-500 text-gray-400">{stats?.points || 0} pts</span>
        </div>
        <div className="h-2 dark:bg-gray-800 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, ((stats?.points || 0) / 500) * 100)}%` }}
          />
        </div>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">
          {(stats?.points || 0) >= 500
            ? 'Has alcanzado el nivel maximo!'
            : `Faltan ${500 - (stats?.points || 0)} puntos para llegar a Rescatador Elite`}
        </p>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-lg font-semibold dark:text-white text-gray-900">Informacion personal</h2>
        </div>

        <Card glass className="p-6 space-y-4">
          <Input
            label="Nombre completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            icon={<User className="w-4 h-4 text-primary" />}
            placeholder="Tu nombre"
          />

          <Input
            label="Correo electronico"
            value={user?.email || ''}
            disabled
            icon={<Mail className="w-4 h-4 text-gray-500" />}
            className="opacity-70 cursor-not-allowed"
          />

          <Input
            label="Telefono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            icon={<Phone className="w-4 h-4 text-primary" />}
            placeholder="+34 123 456 789"
          />

          <div className="pt-2">
            <Button onClick={handleSave} loading={updateMutation.isPending} className="w-full md:w-auto">
              Guardar cambios
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gray-600 rounded-full" />
          <h2 className="text-lg font-semibold dark:text-white text-gray-900">Configuracion</h2>
        </div>

        <Card glass className="p-6">
          <div className="flex items-center justify-between p-4 dark:bg-black/40 bg-gray-100 rounded-xl">
            <div>
              <p className="text-sm font-medium dark:text-white text-gray-900">Cerrar sesion</p>
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">Salir de tu cuenta actual</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar sesion
            </Button>
          </div>
        </Card>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </motion.div>
  )
}
