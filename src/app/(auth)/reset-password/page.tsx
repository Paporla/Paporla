'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'
import { getPasswordChecks } from '@/lib/utils/validations'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // L-31: los errores de este formulario hay que LEERLOS para corregir algo,
  // así que se quedan escritos junto al campo en vez de volar 4 segundos.
  // `submitAttempted` evita regañar a quien todavía no ha pulsado el botón, y
  // `linkError` es el cartel fijo del enlace caducado (con su enlace a pedir
  // uno nuevo), que no se borra solo.
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const router = useRouter()

  // Requisitos de contraseña en tiempo real (compartido)
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password])

  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed)
  const showPasswordHints = (password.length > 0 || submitAttempted) && !allPasswordChecksPassed

  // Mensajes en línea: aparecen al intentar enviar y se van solos en cuanto el
  // campo está bien (se recalculan en cada render, no hay que limpiarlos).
  const requirementsError =
    submitAttempted && !allPasswordChecksPassed
      ? 'La contraseña no cumple todos los requisitos de seguridad'
      : undefined
  const mismatchError = submitAttempted && password !== confirmPassword ? 'Las contraseñas no coinciden' : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    setLoading(true)

    // L-31: ni el aviso de "no coinciden" ni el de "requisitos" vuelan ya; los
    // dos están escritos debajo de su campo (mismatchError / requirementsError).
    if (password !== confirmPassword || !allPasswordChecksPassed) {
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      // Este fallo no lo arregla el formulario: el enlace caducó. Se queda
      // escrito, con la salida a mano, hasta que el dueño navegue.
      setLinkError('El enlace no es válido o ha expirado.')
    } else {
      await supabase.auth.signOut()
      setSuccess(true)
      setTimeout(() => router.replace('/login?password_updated=true'), 3000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">
          <span className="text-gradient">Contraseña actualizada!</span>
        </h2>
        <p className="text-gray-400">Tu contraseña ha sido cambiada exitosamente.</p>
        <p className="text-sm text-gray-500">Serás redirigido al inicio de sesión...</p>
        <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1 mt-2">
          Ir ahora <ArrowLeft className="w-4 h-4" />
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-gray-400 text-sm text-center">Ingresa tu nueva contraseña segura.</p>

        {linkError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-2">
            <p className="text-sm font-medium text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {linkError}
            </p>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Solicitar un enlace nuevo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="relative">
          <Input
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            error={requirementsError}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-primary transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Requisitos de contraseña en tiempo real */}
        <AnimatePresence>
          {showPasswordHints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 space-y-1.5">
                <p className="text-xs text-gray-500 mb-1">La contraseña debe tener:</p>
                {passwordChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2 text-xs">
                    {check.passed ? (
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={check.passed ? 'text-green-400' : 'text-gray-400'}>{check.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Input
          label="Confirmar nueva contraseña"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock className="w-4 h-4" />}
          error={mismatchError}
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>

        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-400 hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </motion.div>
  )
}
