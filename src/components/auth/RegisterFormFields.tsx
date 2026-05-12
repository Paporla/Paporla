'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, Store, Eye, EyeOff } from 'lucide-react'
import Input from '@/components/ui/Input'
import RegisterRoleSelector from './RegisterRoleSelector'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  name: string
  phone: string
  role: 'user' | 'comercio'
  shopName: string
}

interface Props {
  formData: FormData
  onChange: (data: FormData) => void
  agreedToTerms: boolean
  onTermsChange: (v: boolean) => void
}

export default function RegisterFormFields({ formData, onChange, agreedToTerms, onTermsChange }: Props) {
  const [showPassword, setShowPassword] = useState(false)

  const update = (partial: Partial<FormData>) => onChange({ ...formData, ...partial })

  return (
    <div className="space-y-6">
      <RegisterRoleSelector role={formData.role} onChange={(role) => update({ role, shopName: role === 'user' ? '' : formData.shopName })} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        <Input label="Correo electronico" type="email" placeholder="tu@email.com" value={formData.email}
          onChange={(e) => update({ email: e.target.value })} icon={<Mail className="w-4 h-4" />} required />

        <div className="relative">
          <Input label="Contrasena" type={showPassword ? 'text' : 'password'} placeholder="******" value={formData.password}
            onChange={(e) => update({ password: e.target.value })} icon={<Lock className="w-4 h-4" />} required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-primary transition-colors">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Input label="Confirmar contrasena" type="password" placeholder="******" value={formData.confirmPassword}
          onChange={(e) => update({ confirmPassword: e.target.value })} icon={<Lock className="w-4 h-4" />} required />

        <Input label="Nombre completo" placeholder="Juan Perez" value={formData.name}
          onChange={(e) => update({ name: e.target.value })} icon={<User className="w-4 h-4" />} required />

        <Input label="Telefono (opcional)" placeholder="+58 212 555 1234" value={formData.phone}
          onChange={(e) => update({ phone: e.target.value })} icon={<Phone className="w-4 h-4" />} />
      </motion.div>

      <AnimatePresence>
        {formData.role === 'comercio' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Input label="Nombre del comercio" placeholder="Mi Restaurante" value={formData.shopName}
              onChange={(e) => update({ shopName: e.target.value })} icon={<Store className="w-4 h-4" />} required />
            <p className="text-xs text-gray-500 mt-1 ml-10">Puedes completar el resto despues en tu panel</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-start gap-3">
        <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary" />
        <label htmlFor="terms" className="text-sm text-gray-400 leading-relaxed">
          Acepto los <Link href="/legal/terminos" className="text-primary hover:underline">Terminos y Condiciones</Link> y la{' '}
          <Link href="/legal/privacidad" className="text-primary hover:underline">Politica de Privacidad</Link>
        </label>
      </motion.div>
    </div>
  )
}
