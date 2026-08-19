'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, LogOut, Mail, Phone, User } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { normalizePhoneE164 } from '@/lib/auth/profile'
import { pageVariants } from '@/lib/utils/motion'
import type { UserProfile } from '@/types/user'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import PageLoadingSpinner from '@/components/ui/PageLoadingSpinner'

interface ProfileFormProps {
  profile: UserProfile
  refreshProfile: () => Promise<UserProfile | null>
  signOut: () => Promise<void>
}

function ProfileForm({ profile, refreshProfile, signOut }: ProfileFormProps) {
  const { updateProfile } = useProfile()
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [phone, setPhone] = useState(profile.phoneE164 ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateMutation = useMutation({
    mutationFn: async () => {
      const normalizedPhone = normalizePhoneE164(phone)
      await updateProfile({
        displayName,
        phoneE164: normalizedPhone,
        avatarPath: profile.avatarPath,
        marketId: profile.marketId,
        localityId: profile.localityId,
        locale: profile.locale,
      })
    },
    onSuccess: async () => {
      await refreshProfile()
      setSuccess('Perfil actualizado correctamente')
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  const handleSave = async () => {
    setError('')
    setSuccess('')
    await updateMutation.mutateAsync().catch(() => {})
  }

  const memberSince = new Intl.DateTimeFormat(profile.locale || 'es-CL', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.createdAt))

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Mi perfil</h1>
        </div>
        <p className="dark:text-gray-400 text-gray-600">Gestiona tu información personal.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card glass className="p-5 flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <p className="text-xs dark:text-gray-500 text-gray-500">Miembro desde</p>
            <p className="font-semibold dark:text-white text-gray-900 capitalize">{memberSince}</p>
          </div>
        </Card>
        <Card glass className="p-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-xs dark:text-gray-500 text-gray-500">Estado del correo</p>
            <p className="font-semibold dark:text-white text-gray-900">
              {profile.emailConfirmedAt ? 'Confirmado' : 'Pendiente de confirmación'}
            </p>
          </div>
        </Card>
      </div>

      <Card glass className="p-6 space-y-4">
        <h2 className="text-lg font-semibold dark:text-white text-gray-900">Información personal</h2>

        <Input
          label="Nombre completo"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          icon={<User className="w-4 h-4 text-primary" />}
          placeholder="Tu nombre"
        />

        <Input
          label="Correo electrónico"
          value={profile.email ?? ''}
          disabled
          icon={<Mail className="w-4 h-4 text-gray-500" />}
          className="opacity-70 cursor-not-allowed"
        />

        <Input
          label="Teléfono"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          icon={<Phone className="w-4 h-4 text-primary" />}
          placeholder="+56955551234"
          autoComplete="tel"
        />
        <p className="text-xs dark:text-gray-500 text-gray-500">Usa el formato internacional con código de país.</p>

        <Button onClick={handleSave} loading={updateMutation.isPending} className="w-full md:w-auto">
          Guardar cambios
        </Button>
      </Card>

      <Card glass className="p-6">
        <div className="flex items-center justify-between gap-4 p-4 dark:bg-black/40 bg-gray-100 rounded-xl">
          <div>
            <p className="text-sm font-medium dark:text-white text-gray-900">Cerrar sesión</p>
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5">Salir de tu cuenta actual.</p>
          </div>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </Card>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </motion.div>
  )
}

export default function ProfilePage() {
  const { user, loading, signOut, getUser } = useAuth()

  if (loading || !user) {
    return <PageLoadingSpinner message="Cargando tu perfil..." />
  }

  return <ProfileForm key={user.id} profile={user} refreshProfile={getUser} signOut={signOut} />
}
