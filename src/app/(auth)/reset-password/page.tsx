'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react'
import { getPasswordChecks } from '@/lib/utils/validations'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

export default function ResetPasswordPage() {
  const supabase = supabaseBrowser()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  // Lote UX punto 4: los fallos viajan al ToastProvider global (role="alert",
  // 4 s) en vez de un <Toast> local con estado propio. El cartel viejo también
  // se cerraba solo a los 4 s, así que el comportamiento no cambia: solo se
  // unifica el sitio donde sale y se quita un temporizador duplicado.
  const { addToast } = useToast()

  // Requisitos de contraseña en tiempo real (compartido)
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password])

  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed)
  const showPasswordHints = password.length > 0 && !allPasswordChecksPassed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (password !== confirmPassword) {
      addToast('Las contraseñas no coinciden', 'error')
      setLoading(false)
      return
    }

    if (!allPasswordChecksPassed) {
      addToast('La contraseña no cumple todos los requisitos de seguridad', 'error')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      addToast('El enlace no es válido o ha expirado. Solicita uno nuevo.', 'error')
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
