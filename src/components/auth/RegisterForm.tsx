'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import RegisterFormFields from './RegisterFormFields'
import { ArrowRight } from 'lucide-react'
import { registerSchema } from '@/lib/utils/validations'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (field: string, value: string) => {
    const result = registerSchema.safeParse({ ...formData, [field]: value })
    if (!result.success) {
      const fieldError = result.error.errors.find((e) => e.path[0] === field)
      setFieldErrors((prev) => ({ ...prev, [field]: fieldError?.message }))
    } else {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (field === 'confirmPassword') {
      if (value !== formData.password) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }))
      } else {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, formData[field as keyof typeof formData] as string)
  }
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const { signUp } = useAuth()

  const validateForm = () => {
    const errors: Record<string, string> = {}

    const result = registerSchema.safeParse({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone ?? undefined,
      role: formData.role,
      shopName: formData.role === 'comercio' ? formData.shopName : undefined,
    })

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (!errors[field]) errors[field] = issue.message
      })
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, name: true, confirmPassword: true })
    setLoading(true)
    setError('')

    if (!agreedToTerms) {
      setError('Debes aceptar los terminos y condiciones')
      setLoading(false)
      return
    }

    if (!validateForm()) {
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
          ? { name: formData.shopName, description: null, address: null, city: null, phone: formData.phone ?? null }
          : undefined,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RegisterFormFields
        formData={formData}
        onChange={setFormData}
        agreedToTerms={agreedToTerms}
        onTermsChange={setAgreedToTerms}
        errors={fieldErrors}
        onClearError={(field) =>
          setFieldErrors((prev) => {
            const n = { ...prev }
            delete n[field]
            return n
          })
        }
        touched={touched}
        onFieldBlur={handleBlur}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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

      <div className="text-center text-sm dark:text-gray-400 text-gray-600 pt-2">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
          Inicia sesión aquí <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </form>
  )
}
