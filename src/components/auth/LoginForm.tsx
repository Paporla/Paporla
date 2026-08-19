'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { loginSchema } from '@/lib/utils/validations'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (field: string, value: string) => {
    const result = loginSchema.safeParse({ email, password, [field]: value })
    if (!result.success) {
      const fieldError = result.error.errors.find((e) => e.path[0] === field)
      setFieldErrors((prev) => ({ ...prev, [field]: fieldError?.message }))
    } else {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    if (field === 'email') validateField('email', email)
    if (field === 'password') validateField('password', password)
  }
  const { signIn } = useAuth()
  const { addToast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    if (searchParams.get('registered') === 'true') {
      addToast('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.', 'success')
    }
    if (searchParams.get('password_updated') === 'true') {
      addToast('Contraseña actualizada. Ya puedes iniciar sesión.', 'success')
    }
  }, [addToast, searchParams])

  const validateForm = () => {
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors: { email?: string; password?: string } = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof typeof errors
        errors[field] ??= issue.message
      })
      setFieldErrors(errors)
      return false
    }
    setFieldErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    setLoading(true)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      await signIn(email, password)

      if (rememberMe) {
        sessionStorage.setItem('remembered_email', email)
      } else {
        sessionStorage.removeItem('remembered_email')
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al iniciar sesión', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Correo electrónico"
        type="email"
        name="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setFieldErrors((prev) => ({ ...prev, email: undefined }))
        }}
        onBlur={() => handleBlur('email')}
        icon={<Mail className="w-4 h-4" />}
        autoComplete="email"
        required
        error={touched.email ? fieldErrors.email : undefined}
      />

      <div className="relative">
        <Input
          label="Contraseña"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          onBlur={() => handleBlur('password')}
          icon={<Lock className="w-4 h-4" />}
          autoComplete="current-password"
          required
          error={touched.password ? fieldErrors.password : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-9 text-gray-400 hover:text-primary transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
          />
          <span className="text-sm text-gray-400">Recordarme</span>
        </label>

        <Link href="/forgot-password" className="text-sm text-primary hover:underline transition-colors">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" className="w-full py-2.5" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>

      <div className="text-center text-sm text-gray-400">
        No tienes cuenta?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Regístrate aquí
        </Link>
      </div>
    </form>
  )
}
