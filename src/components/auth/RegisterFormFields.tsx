'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, Store, Eye, EyeOff, Check, X } from 'lucide-react'
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
  errors?: Record<string, string | undefined>
  onClearError?: (field: string) => void
  touched?: Record<string, boolean>
  onFieldBlur?: (field: string) => void
}

export default function RegisterFormFields({
  formData,
  onChange,
  agreedToTerms,
  onTermsChange,
  errors = {},
  onClearError,
  touched = {},
  onFieldBlur,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)

  // Requisitos de contraseña en tiempo real
  const passwordChecks = useMemo(() => {
    const pwd = formData.password
    return [
      { label: 'Al menos 8 caracteres', passed: pwd.length >= 8 },
      { label: 'Una letra mayuscula', passed: /[A-Z]/.test(pwd) },
      { label: 'Un numero', passed: /[0-9]/.test(pwd) },
    ]
  }, [formData.password])

  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed)
  const showPasswordHints = formData.password.length > 0 && !allPasswordChecksPassed

  const update = (partial: Partial<FormData>) => {
    const key = Object.keys(partial)[0]
    onClearError?.(key)
    onChange({ ...formData, ...partial })
  }

  return (
    <div className="space-y-6">
      <RegisterRoleSelector
        role={formData.role}
        onChange={(role) => update({ role, shopName: role === 'user' ? '' : formData.shopName })}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <Input
          label="Correo electronico"
          type="email"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(e) => update({ email: e.target.value })}
          onBlur={() => onFieldBlur?.('email')}
          icon={<Mail className="w-4 h-4" />}
          required
          error={touched.email ? errors.email : undefined}
        />

        <div className="relative">
          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="******"
            value={formData.password}
            onChange={(e) => update({ password: e.target.value })}
            onBlur={() => onFieldBlur?.('password')}
            icon={<Lock className="w-4 h-4" />}
            required
            error={touched.password ? errors.password : undefined}
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
          label="Confirmar contraseña"
          type="password"
          placeholder="******"
          value={formData.confirmPassword}
          onChange={(e) => update({ confirmPassword: e.target.value })}
          onBlur={() => onFieldBlur?.('confirmPassword')}
          icon={<Lock className="w-4 h-4" />}
          required
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
        />

        <Input
          label="Nombre completo"
          placeholder="Juan Perez"
          value={formData.name}
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => onFieldBlur?.('name')}
          icon={<User className="w-4 h-4" />}
          required
          error={touched.name ? errors.name : undefined}
        />

        <Input
          label="Telefono (opcional)"
          placeholder="+56 9 5555 1234"
          value={formData.phone}
          onChange={(e) => update({ phone: e.target.value })}
          onBlur={() => onFieldBlur?.('phone')}
          icon={<Phone className="w-4 h-4" />}
        />
      </motion.div>

      <AnimatePresence>
        {formData.role === 'comercio' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Input
              label="Nombre del comercio"
              placeholder="Mi Restaurante"
              value={formData.shopName}
              onChange={(e) => update({ shopName: e.target.value })}
              onBlur={() => onFieldBlur?.('shopName')}
              icon={<Store className="w-4 h-4" />}
              required
              error={touched.shopName ? errors.shopName : undefined}
            />
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-1 ml-10">
              Puedes completar el resto despues en tu panel
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-3"
      >
        <input
          type="checkbox"
          id="terms"
          checked={agreedToTerms}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded dark:border-gray-700 border-gray-300 dark:bg-gray-800 bg-gray-100 text-primary focus:ring-primary"
        />
        <label htmlFor="terms" className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">
          Acepto los{' '}
          <Link href="/legal/terminos" className="text-primary hover:underline">
            Terminos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/legal/privacidad" className="text-primary hover:underline">
            Politica de Privacidad
          </Link>
        </label>
      </motion.div>
    </div>
  )
}
