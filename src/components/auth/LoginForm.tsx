'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn } = useAuth()

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
    
    // Mensaje de registro exitoso
    const params = new URLSearchParams(window.location.search)
    if (params.get('registered') === 'true') {
      setSuccess('✅ ¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await signIn(email, password)
      
      if (rememberMe) {
        localStorage.setItem('remembered_email', email)
      } else {
        localStorage.removeItem('remembered_email')
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Correo electrónico"
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        icon={<Mail className="w-4 h-4" />}
        required
      />
      
      <div className="relative">
        <Input
          label="Contraseña"
          type={showPassword ? "text" : "password"}
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
        
        <Link 
          href="/forgot-password" 
          className="text-sm text-primary hover:underline transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      
      <Button type="submit" className="w-full py-2.5" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>
      
      <div className="text-center text-sm text-gray-400">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Regístrate aquí
        </Link>
      </div>
      
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </form>
  )
}