'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle, AlertCircle, MapPin, Mail, Clock } from 'lucide-react'
import { apiHeaders, getCsrfToken } from '@/lib/utils/api-client'

/**
 * A-03 (auditoría externa): este formulario ANTES mentía. Esperaba 1,5 segundos
 * con un setTimeout y mostraba "¡Mensaje enviado! Te responderemos pronto" sin
 * enviar nada a ninguna parte. Quien escribía por un problema creía haber
 * hablado con Paporla y su mensaje se tiraba a la basura.
 *
 * Ahora llama de verdad a /api/contacto. Y si el correo NO sale, se dice: se
 * muestra el error y se ofrece la dirección real para escribir por cuenta
 * propia. Un "enviado" falso es peor que un error honesto.
 */

type SubmitStatus = 'idle' | 'success' | 'error'
type FieldErrors = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@paporla.com'

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  // Trampa para robots: un campo que una persona nunca ve ni rellena.
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // El error se apaga en cuanto la persona empieza a corregir ese campo.
    setFieldErrors((prev) => (prev[name as keyof FieldErrors] ? { ...prev, [name]: undefined } : prev))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setFieldErrors({})

    // El middleware exige el token CSRF en TODAS las mutaciones de /api
    // (patrón de doble envío: cookie legible + cabecera). Usamos el helper del
    // proyecto en vez de montar las cabeceras a mano. Si la cookie no está
    // (navegador con cookies bloqueadas, o primera visita rara), se dice y se
    // ofrece el correo: mejor eso que un 403 sin explicación.
    if (!getCsrfToken()) {
      setSubmitStatus('error')
      setStatusMessage(
        'No hemos podido preparar el envío de forma segura. Recarga la página e inténtalo de nuevo, o escríbenos directamente.',
      )
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ ...formData, website: honeypot }),
      })

      const payload: {
        success?: boolean
        error?: string
        field?: string
        fallbackEmail?: string
      } = await response.json().catch(() => ({}))

      if (response.ok && payload.success) {
        setSubmitStatus('success')
        setStatusMessage('¡Mensaje enviado! Te responderemos pronto.')
        setFormData({ name: '', email: '', subject: '', message: '' })
        setHoneypot('')
        return
      }

      // Si el servidor dice qué campo está mal, el error va JUNTO al campo.
      const badField = payload.field && payload.field in formData ? payload.field : null
      if (badField) {
        setFieldErrors({ [badField]: payload.error ?? 'Revisa este campo' } as FieldErrors)
      }

      // Y siempre se deja una salida: la dirección real.
      // Ojo: si el error ya va pegado a su campo, el cartel de arriba NO lo
      // repite entero —verías dos veces lo mismo y confunde— sino que señala.
      setSubmitStatus('error')
      setStatusMessage(
        badField
          ? 'Revisa el campo marcado en rojo.'
          : payload.fallbackEmail
            ? `${payload.error ?? 'No se pudo enviar el mensaje.'} También puedes escribirnos directamente.`
            : (payload.error ?? 'No se pudo enviar el mensaje. Inténtalo de nuevo.'),
      )
    } catch {
      setSubmitStatus('error')
      setStatusMessage(
        'No hemos podido contactar con el servidor. Revisa tu conexión e inténtalo de nuevo, o escríbenos directamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-3 rounded-xl dark:bg-white/10 bg-white dark:text-white text-gray-900 outline-none transition-all ${
      fieldErrors[field]
        ? 'border border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
        : 'dark:border-gray-600 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
    }`

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Contáctanos</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl">
              ¿Tienes preguntas, sugerencias o quieres colaborar con nosotros? Estamos aquí para ayudarte.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Información de contacto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="glass-card rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6 text-gradient">Información</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 rounded-xl dark:hover:bg-white/5 hover:bg-gray-100 transition-all">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Dirección</h3>
                    <p className="text-gray-600 dark:text-gray-300">Santiago, Chile</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl dark:hover:bg-white/5 hover:bg-gray-100 transition-all">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    {/* Antes era texto plano. Si el formulario falla, este enlace
                        es la salida: que al menos se pueda pulsar. */}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline break-all">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl dark:hover:bg-white/5 hover:bg-gray-100 transition-all">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Horario de respuesta</h3>
                    <p className="text-gray-600 dark:text-gray-300">Lunes a viernes, 9:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Formulario */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gradient">Envíanos un mensaje</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Completa el formulario y te responderemos pronto.</p>

              {submitStatus === 'success' && (
                <div
                  role="status"
                  className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div
                  role="alert"
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p>{statusMessage}</p>
                    {/* La salida siempre visible cuando algo falla. */}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block mt-2 font-semibold underline">
                      Escribir a {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              )}

              {/* L-40: noValidate. Sin esto, el navegador bloquea el envío con
                  su burbuja gris y nuestros mensajes en español no salen nunca. */}
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Trampa para robots: fuera de la pantalla, sin tabulador ni
                    lector de pantalla. Quien lo rellene es un bot. */}
                <div aria-hidden="true" className="absolute left-[-9999px] top-0 w-0 h-0 overflow-hidden">
                  <label htmlFor="contact-website">No rellenar este campo</label>
                  <input
                    id="contact-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
                    >
                      Nombre completo *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                      className={inputClass('name')}
                      placeholder="Tu nombre"
                    />
                    {fieldErrors.name && (
                      <p id="contact-name-error" className="mt-1.5 text-sm text-red-500">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
                    >
                      Email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                      className={inputClass('email')}
                      placeholder="tu@email.com"
                    />
                    {fieldErrors.email && (
                      <p id="contact-email-error" className="mt-1.5 text-sm text-red-500">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
                  >
                    Asunto *
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    aria-invalid={Boolean(fieldErrors.subject)}
                    aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
                    className={inputClass('subject')}
                    placeholder="¿Sobre qué quieres hablar?"
                  />
                  {fieldErrors.subject && (
                    <p id="contact-subject-error" className="mt-1.5 text-sm text-red-500">
                      {fieldErrors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
                  >
                    Mensaje *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                    className={inputClass('message')}
                    placeholder="Cuéntanos detalladamente tu mensaje..."
                  />
                  {fieldErrors.message && (
                    <p id="contact-message-error" className="mt-1.5 text-sm text-red-500">
                      {fieldErrors.message}
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-xl font-semibold text-white dark:text-black transition-all duration-300 flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/25'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar mensaje
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Sin mapa: Paporla es una plataforma 100% digital, no hay oficina
            fisica que visitar. Ademas la CSP (frame-src) bloquea iframes de
            Google Maps a proposito; no la abrimos para un mapa sin marcador. */}
      </div>
    </div>
  )
}
