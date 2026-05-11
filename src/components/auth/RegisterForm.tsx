'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import {
  Mail,
  Lock,
  User,
  Phone,
  Store,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Store as StoreIcon,
} from 'lucide-react'

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'user' as 'user' | 'comercio',
    shopName: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    if (!agreedToTerms) {
      setError('Debes aceptar los términos y condiciones')
      setLoading(false)
      return
    }

    if (!formData.email) {
      setError('El correo electrónico es requerido')
      setLoading(false)
      return
    }

    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (!formData.name) {
      setError('El nombre es requerido')
      setLoading(false)
      return
    }

    if (formData.role === 'comercio' && !formData.shopName) {
      setError('El nombre del comercio es requerido')
      setLoading(false)
      return
    }

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.phone,
        formData.role === 'comercio'
          ? {
              name: formData.shopName,
              description: null,
              address: null,
              city: null,
              phone: formData.phone || null,
            }
          : undefined
      )
    } catch (err: any) {
      console.error('Error en registro:', err)
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de tipo de cuenta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <label className="text-sm font-medium text-gray-300">
            Elige tu tipo de cuenta
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tarjeta USUARIO */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              setFormData({
                ...formData,
                role: 'user',
              })
            }
            className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
              formData.role === 'user'
                ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
                : 'border-white/10 bg-white/5 hover:border-primary/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-10 h-10 rounded-xl ${
                  formData.role === 'user' ? 'bg-primary/20' : 'bg-white/10'
                } flex items-center justify-center`}
              >
                <UserCheck
                  className={`w-5 h-5 ${
                    formData.role === 'user'
                      ? 'text-primary'
                      : 'text-gray-500'
                  }`}
                />
              </div>

              {formData.role === 'user' && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </div>

            <div
              className={`font-semibold ${
                formData.role === 'user' ? 'text-primary' : 'text-white'
              }`}
            >
              Usuario
            </div>

            <p className="text-xs text-gray-400 mt-1">
              Reserva packs sorpresa
            </p>
          </motion.button>

          {/* Tarjeta COMERCIO */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              setFormData({
                ...formData,
                role: 'comercio',
              })
            }
            className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
              formData.role === 'comercio'
                ? 'border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg shadow-primary/20'
                : 'border-white/10 bg-white/5 hover:border-primary/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-10 h-10 rounded-xl ${
                  formData.role === 'comercio'
                    ? 'bg-primary/20'
                    : 'bg-white/10'
                } flex items-center justify-center`}
              >
                <StoreIcon
                  className={`w-5 h-5 ${
                    formData.role === 'comercio'
                      ? 'text-primary'
                      : 'text-gray-500'
                  }`}
                />
              </div>

              {formData.role === 'comercio' && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </div>

            <div
              className={`font-semibold ${
                formData.role === 'comercio' ? 'text-primary' : 'text-white'
              }`}
            >
              Comercio
            </div>

            <p className="text-xs text-gray-400 mt-1">
              Vende tus excedentes
            </p>
          </motion.button>
        </div>
      </motion.div>

      {/* Campos comunes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value,
            })
          }
          icon={<Mail className="w-4 h-4" />}
          required
        />

        <div className="relative">
          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
            icon={<Lock className="w-4 h-4" />}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-400 hover:text-primary transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <Input
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({
              ...formData,
              confirmPassword: e.target.value,
            })
          }
          icon={<Lock className="w-4 h-4" />}
          required
        />

        <Input
          label="Nombre completo"
          placeholder="Juan Pérez"
          value={formData.name}
          onChange={(e) =>
            setFormData({
              ...formData,
              name: e.target.value,
            })
          }
          icon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Teléfono opcional"
          placeholder="+58 212 555 1234"
          value={formData.phone}
          onChange={(e) =>
            setFormData({
              ...formData,
              phone: e.target.value,
            })
          }
          icon={<Phone className="w-4 h-4" />}
        />
      </motion.div>

      {/* Nombre del comercio solo si elige comercio */}
      <AnimatePresence>
        {formData.role === 'comercio' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Input
              label="Nombre del comercio"
              placeholder="Mi Restaurante"
              value={formData.shopName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shopName: e.target.value,
                })
              }
              icon={<Store className="w-4 h-4" />}
              required
            />

            <p className="text-xs text-gray-500 mt-1 ml-10">
              Puedes completar el resto de la información después en tu panel
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Términos */}
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
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
        />

        <label htmlFor="terms" className="text-sm text-gray-400 leading-relaxed">
          Acepto los{' '}
          <Link href="/legal/terminos" className="text-primary hover:underline">
            Términos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/legal/privacidad" className="text-primary hover:underline">
            Política de Privacidad
          </Link>
        </label>
      </motion.div>

      {/* Botón de registro */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          type="submit"
          loading={loading}
          className="w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
        >
          {formData.role === 'comercio' ? (
            <>
              Registrar comercio <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Crear cuenta <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>

      {/* Enlace a login */}
      <div className="text-center text-sm text-gray-400 pt-2">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          Inicia sesión aquí <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => setError('')}
        />
      )}
    </form>
  )
}