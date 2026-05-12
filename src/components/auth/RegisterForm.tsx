'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import RegisterFormFields from './RegisterFormFields'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', name: '', phone: '',
    role: 'user' as 'user' | 'comercio', shopName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!agreedToTerms) { setError('Debes aceptar los terminos y condiciones'); setLoading(false); return }
    if (!formData.email) { setError('El correo es requerido'); setLoading(false); return }
    if (!formData.password || formData.password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); setLoading(false); return }
    if (formData.password !== formData.confirmPassword) { setError('Las contrasenas no coinciden'); setLoading(false); return }
    if (!formData.name) { setError('El nombre es requerido'); setLoading(false); return }
    if (formData.role === 'comercio' && !formData.shopName) { setError('El nombre del comercio es requerido'); setLoading(false); return }

    try {
      await signUp(formData.email, formData.password, formData.name, formData.role, formData.phone,
        formData.role === 'comercio' ? { name: formData.shopName, description: null, address: null, city: null, phone: formData.phone || null } : undefined)
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RegisterFormFields formData={formData} onChange={setFormData} agreedToTerms={agreedToTerms} onTermsChange={setAgreedToTerms} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Button type="submit" loading={loading} className="w-full py-3 text-base font-semibold flex items-center justify-center gap-2">
          {formData.role === 'comercio' ? <>Registrar comercio <ArrowRight className="w-4 h-4" /></> : <>Crear cuenta <ArrowRight className="w-4 h-4" /></>}
        </Button>
      </motion.div>

      <div className="text-center text-sm text-gray-400 pt-2">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
          Inicia sesion aqui <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </form>
  )
}
