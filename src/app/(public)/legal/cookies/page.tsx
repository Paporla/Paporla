'use client';

import { motion } from 'framer-motion';
import { 
  Cookie, Settings, Eye, Shield, Database, 
  CheckCircle, AlertCircle, Info, XCircle,
  Calendar, MapPin, Mail, ChevronRight
} from 'lucide-react';

export default function CookiesPage() {
  const cookieTypes = [
    { 
      name: 'Esenciales', 
      icon: Shield, 
      color: 'text-green-500', 
      bg: 'bg-green-500/10',
      description: 'Necesarias para el funcionamiento básico de la plataforma',
      cookies: ['session', 'auth_token', 'csrf_token'],
      duration: 'Sesión / 7 días',
      required: true
    },
    { 
      name: 'Preferencias', 
      icon: Settings, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      description: 'Recuerdan tus ajustes y preferencias',
      cookies: ['theme_mode', 'language', 'filters'],
      duration: '1 año',
      required: false
    },
    { 
      name: 'Analíticas', 
      icon: Eye, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10',
      description: 'Nos ayudan a mejorar la plataforma',
      cookies: ['_ga', '_gid', '_gat'],
      duration: '2 años / 24 horas',
      required: false
    },
    { 
      name: 'Marketing', 
      icon: Info, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      description: 'Para mostrar contenido relevante',
      cookies: ['_fbp', '_gcl_au'],
      duration: '3 meses / 90 días',
      required: false
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-16">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
            >
              <Cookie className="w-4 h-4" />
              <span className="text-sm font-medium">Transparencia total</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Política de Cookies</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
              Información transparente sobre cómo utilizamos cookies para mejorar tu experiencia
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />Última actualización: 15 Enero 2025</div>
              <div className="flex items-center gap-1"><Shield className="w-4 h-4" />RGPD / Ley Infogobierno</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Cookie className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">¿Qué son las cookies?</p>
                <p className="text-sm text-gray-500">Pequeños archivos que guardamos en tu navegador para recordar tus preferencias</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Tú decides</p>
                <p className="text-sm text-gray-500">Puedes gestionar tus preferencias de cookies en cualquier momento</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - Índice */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 glass-card rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-gradient flex items-center gap-2">
                <Cookie className="w-4 h-4" />
                Contenido
              </h3>
              <nav className="space-y-2">
                <a href="#que-son" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-all duration-300">📖 ¿Qué son las cookies?</a>
                <a href="#tipos" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-all duration-300">🍪 Tipos de cookies</a>
                <a href="#gestion" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-all duration-300">⚙️ Gestión de cookies</a>
                <a href="#terceros" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-all duration-300">🔗 Cookies de terceros</a>
                <a href="#consentimiento" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 hover:text-primary transition-all duration-300">✅ Consentimiento</a>
              </nav>
            </div>
          </motion.div>

          {/* Contenido principal */}
          <div className="lg:col-span-2 space-y-6">
            <motion.section id="que-son" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Info className="w-6 h-6 text-primary" />
                  ¿Qué son las cookies?
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Las cookies son pequeños archivos de texto que los sitios web colocan en tu dispositivo (computadora, tablet o teléfono) cuando los visitas. Las cookies permiten que el sitio web:
                </p>
                <ul className="list-none mt-4 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Recuerde tus acciones y preferencias (como inicio de sesión, idioma, modo oscuro)</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Mantenga tu sesión activa de forma segura</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Mejore la velocidad y rendimiento del sitio</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Recopile información anónima sobre cómo usas la plataforma</li>
                </ul>
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm">💡 <strong>Dato importante:</strong> Las cookies no contienen virus ni pueden dañar tu dispositivo. Solo almacenan información que tú has proporcionado o que se genera durante tu navegación.</p>
                </div>
              </div>
            </motion.section>

            <motion.section id="tipos" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Cookie className="w-6 h-6 text-primary" />
                  Tipos de cookies que utilizamos
                </h2>
                <div className="space-y-4">
                  {cookieTypes.map((type, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-xl ${type.bg} border border-opacity-20`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <type.icon className={`w-5 h-5 ${type.color}`} />
                          <h3 className="font-bold text-lg">{type.name}</h3>
                          {type.required && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400">Siempre activas</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{type.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div><strong>Cookies:</strong> {type.cookies.join(', ')}</div>
                        <div><strong>Duración:</strong> {type.duration}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section id="gestion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Settings className="w-6 h-6 text-primary" />
                  Gestión de cookies
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">Puedes gestionar las cookies de las siguientes maneras:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <h3 className="font-bold text-primary mb-2">🌐 Configuración del navegador</h3>
                    <ul className="text-sm space-y-2">
                      <li><strong>Chrome:</strong> Configuración → Privacidad → Cookies</li>
                      <li><strong>Firefox:</strong> Opciones → Privacidad → Cookies</li>
                      <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
                      <li><strong>Edge:</strong> Configuración → Cookies y permisos</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <h3 className="font-bold text-primary mb-2">🍪 Panel de preferencias</h3>
                    <p className="text-sm">Al visitar Paporla por primera vez, mostramos un banner donde puedes aceptar o rechazar cookies no esenciales. Puedes cambiar tus preferencias en cualquier momento desde el enlace "Configuración de cookies".</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><span><strong>Nota importante:</strong> Al deshabilitar cookies esenciales, algunas funcionalidades de la plataforma (como iniciar sesión o hacer reservas) dejarán de funcionar correctamente.</span></p>
                </div>
              </div>
            </motion.section>

            <motion.section id="terceros" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Database className="w-6 h-6 text-primary" />
                  Cookies de terceros
                </h2>
                <p className="text-gray-700 dark:text-gray-300">Paporla utiliza servicios de terceros que pueden establecer cookies:</p>
                <div className="grid gap-3 mt-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div><strong>Google Analytics</strong><p className="text-xs">Análisis de tráfico</p></div>
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">Política →</a>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div><strong>Supabase</strong><p className="text-xs">Autenticación y base de datos</p></div>
                    <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">Política →</a>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div><strong>Resend</strong><p className="text-xs">Envío de correos</p></div>
                    <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">Política →</a>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section id="consentimiento" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  Consentimiento
                </h2>
                <p className="text-gray-700 dark:text-gray-300">Al continuar utilizando Paporla después de ver nuestro aviso de cookies, aceptas nuestro uso de cookies de acuerdo con esta política. Para cookies no esenciales, requerimos tu consentimiento explícito a través del banner de cookies.</p>
                <p className="text-gray-700 dark:text-gray-300 mt-3">Puedes retirar tu consentimiento en cualquier momento mediante la configuración de cookies o ajustando las preferencias de tu navegador.</p>
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-sm">🔐 <strong>Compromiso de Paporla:</strong> Nunca usamos cookies para rastrear actividades fuera de nuestra plataforma ni para vender tus datos a terceros.</p>
                </div>
              </div>
            </motion.section>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="glass-card rounded-2xl p-6 backdrop-blur-sm text-center"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ¿Tienes preguntas sobre nuestra política de cookies?
              </p>
              <div className="flex justify-center gap-4 mt-3">
                <a href="/contacto" className="text-primary hover:underline flex items-center gap-1">Contactar DPO <ChevronRight className="w-3 h-3" /></a>
                <a href="/legal/privacidad" className="text-primary hover:underline">Política de Privacidad</a>
              </div>
              <p className="text-xs text-gray-500 mt-4">© {new Date().getFullYear()} Paporla - Transparencia total</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}