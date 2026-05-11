'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'

export default function ForgotPasswordForm() {
  const supabase = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico')
      setLoading(false)
      return
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">¡Revisa tu correo!</h2>
        <p className="text-gray-400">
          Te hemos enviado un enlace para restablecer tu contraseña a{' '}
          <strong className="text-primary">{email}</strong>
        </p>
        <p className="text-sm text-gray-500">
          ¿No recibiste el correo?{' '}
          <button
            onClick={() => setSuccess(false)}
            className="text-primary hover:underline"
          >
            Intentar de nuevo
          </button>
        </p>
        <div className="pt-4">
          <Link href="/login" className="text-gray-400 hover:text-primary transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-gray-400 text-sm text-center mb-4">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4" />}
          required
          autoComplete="email"
        />
        
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
        </Button>
        
        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-400 hover:text-primary transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
      
      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  )
}