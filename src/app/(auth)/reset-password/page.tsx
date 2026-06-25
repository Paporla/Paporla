'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Requisitos de contraseña en tiempo real
  const passwordChecks = useMemo(() => {
    const pwd = password
    return [
      { label: 'Al menos 8 caracteres', passed: pwd.length >= 8 },
      { label: 'Una letra mayuscula', passed: /[A-Z]/.test(pwd) },
      { label: 'Un numero', passed: /[0-9]/.test(pwd) },
    ]
  }, [password])

  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed)
  const showPasswordHints = password.length > 0 && !allPasswordChecksPassed

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token')) {
      setError('Enlace invalido o expirado. Por favor, solicita un nuevo enlace de recuperacion.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="w-16 h-16 dark:bg-green-500/20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 dark:text-green-400 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">
          <span className="text-gradient">Contrasena actualizada!</span>
        </h2>
        <p className="dark:text-gray-400 text-gray-600">Tu contraseña ha sido cambiada exitosamente.</p>
        <p className="text-sm dark:text-gray-500 text-gray-400">Seras redirigido al inicio de sesion...</p>
        <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1 mt-2">
          Ir ahora <ArrowLeft className="w-4 h-4" />
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="dark:text-gray-400 text-gray-600 text-sm text-center">Ingresa tu nueva contraseña segura.</p>

        <div className="relative">
          <Input
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 dark:text-gray-400 text-gray-500 hover:text-primary transition-colors"
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
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3 border border-gray-100 dark:border-white/5 space-y-1.5">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">La contraseña debe tener:</p>
                {passwordChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2 text-xs">
                    {check.passed ? (
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={
                        check.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                      }
                    >
                      {check.label}
                    </span>
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
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm dark:text-gray-400 text-gray-600 hover:text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesion
          </Link>
        </div>
      </form>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  )
}
