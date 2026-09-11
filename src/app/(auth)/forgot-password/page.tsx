'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

export default function ForgotPasswordPage() {
  const supabase = supabaseBrowser()
  // Lote UX punto 4 (piloto): los avisos viajan al ToastProvider global en
  // vez de un <Toast> local con estado propio. Mismo mensaje, una sola
  // apariencia y un solo temporizador en toda la app.
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/reset-password`,
    })

    if (error) {
      addToast(error.message, 'error')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  // L-27: la única salida de la pantalla de éxito era volver al login. Si te
  // equivocaste al escribir el correo, aquí puedes corregirlo sin perder nada.
  const handleTryAnother = () => {
    setSent(false)
    setEmail('')
  }

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">
          <span className="text-gradient">Revisa tu correo</span>
        </h2>
        {/*
          L-27 (copia honesta): Supabase NO revela si existe una cuenta con ese
          correo — es anti-enumeración a propósito: si dijera "ese correo no
          existe", cualquiera podría probar correos uno a uno y averiguar quién
          tiene cuenta. Con un correo desconocido no manda nada y contesta "ok"
          igual. Por eso esta pantalla no puede AFIRMAR que envió un enlace;
          antes decía "Te enviamos un enlace a X" y era falso en ese caso.
        */}
        <p className="text-gray-400">
          Si hay una cuenta registrada con <strong className="text-primary">{email}</strong>, te hemos enviado un enlace
          para restablecer tu contraseña.
        </p>
        <p className="text-gray-500 text-sm">Tarda unos minutos y a veces cae en spam o en promociones.</p>
        <div className="flex justify-center">
          <p className="text-gray-500 text-sm text-left max-w-sm inline-flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>
              No te confirmamos si ese correo existe: si lo hiciéramos, esta pantalla serviría para averiguar quién
              tiene cuenta en Paporla.
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleTryAnother} icon={<Mail className="w-4 h-4" />}>
            Probar con otro correo
          </Button>
          <Link href="/login" className="text-sm text-gray-400 hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-gray-400 text-sm text-center">
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
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Cargando...' : 'Enviar enlace'}
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
