'use client';

import { motion } from 'framer-motion';
import { 
  Shield, Eye, Database, Lock, Trash2, RefreshCw, 
  Mail, MapPin, Phone, CheckCircle, AlertCircle, 
  FileText, Server, Key, UserCheck, Cookie, Globe,
  Clock, Bell, Heart, Leaf, Award, XCircle, MessageCircle, Store, Calendar
} from 'lucide-react';

export default function PrivacidadPage() {
  const sections = [
    { id: 'informacion', title: '1. Información que Recopilamos', icon: Database },
    { id: 'uso', title: '2. Uso de la Información', icon: Eye },
    { id: 'compartir', title: '3. Compartir Información', icon: UserCheck },
    { id: 'proteccion', title: '4. Protección de Datos', icon: Lock },
    { id: 'derechos', title: '5. Derechos ARCO', icon: RefreshCw },
    { id: 'cookies', title: '6. Uso de Cookies', icon: Cookie },
    { id: 'retencion', title: '7. Retención de Datos', icon: Clock },
    { id: 'menores', title: '8. Privacidad de Menores', icon: Shield },
    { id: 'transferencias', title: '9. Transferencias Internacionales', icon: Globe },
    { id: 'notificaciones', title: '10. Notificaciones', icon: Bell },
    { id: 'actualizaciones', title: '11. Actualizaciones', icon: RefreshCw },
    { id: 'contacto', title: '12. Contacto', icon: Mail },
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
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Compromiso con tu privacidad</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Política de Privacidad</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
              En Paporla nos tomamos muy en serio la protección de tus datos personales
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />Última actualización: 15 Enero 2025</div>
              <div className="flex items-center gap-1"><Shield className="w-4 h-4" />Ley Infogobierno - Venezuela</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Tus datos están seguros</p>
                <p className="text-sm text-gray-500">Cumplimos con la normativa venezolana e internacional</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <UserCheck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">Tú controlas tu información</p>
                <p className="text-sm text-gray-500">Accede, rectifica o elimina tus datos cuando quieras</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Encriptación avanzada</p>
                <p className="text-sm text-gray-500">Protegemos tu información con SSL/TLS</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 glass-card rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 text-gradient flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contenido
              </h3>
              <nav className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm dark:text-gray-400 text-gray-600 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  >
                    <section.icon className="w-3 h-3" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Contenido principal */}
          <div className="lg:col-span-3 space-y-6">
            <motion.section id="informacion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Database className="w-6 h-6 text-primary" />
                  1. Información que Recopilamos
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-3 flex items-center gap-2"><UserCheck className="w-5 h-5" />Información de registro:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Nombre completo</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Dirección de correo electrónico</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Número de teléfono</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Dirección física (opcional)</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Contraseña (almacenada de forma segura)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-3 flex items-center gap-2"><Eye className="w-5 h-5" />Información de uso:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Historial de reservas y compras</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Preferencias de búsqueda y filtros</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Comercios favoritos</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Calificaciones y reseñas</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-3 flex items-center gap-2"><Server className="w-5 h-5" />Información técnica:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Dirección IP</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Tipo de dispositivo y navegador</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Datos de geolocalización (con tu consentimiento)</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Cookies y tecnologías similares</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-3 flex items-center gap-2"><Award className="w-5 h-5" />Información de comercios (adicional):</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />RIF / Registro fiscal</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Permisos sanitarios</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Información bancaria (para pagos)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><span><strong>Nota importante:</strong> No recopilamos datos sensibles como información médica, orientación sexual, creencias religiosas o afiliación política.</span></p>
                </div>
              </div>
            </motion.section>

            <motion.section id="uso" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Eye className="w-6 h-6 text-primary" />
                  2. Uso de la Información
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Utilizamos su información para los siguientes fines:</p>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Operar y mejorar la plataforma Paporla</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Procesar reservas y gestionar tu cuenta</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Comunicarnos sobre tus reservas y novedades</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Personalizar tu experiencia en la plataforma</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Prevenir fraudes y actividades fraudulentas</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Cumplir con obligaciones legales y regulatorias</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Realizar análisis estadísticos y mejoras del servicio</div>
                  <div className="flex items-start gap-2 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Enviar ofertas y promociones (con tu consentimiento)</div>
                </div>
              </div>
            </motion.section>

            <motion.section id="compartir" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-primary" />
                  3. Compartir Información
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3"><strong className="text-primary">Paporla NO vende ni alquila sus datos personales.</strong> Compartimos información únicamente en los siguientes casos:</p>
                
                <div className="space-y-4 mt-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-semibold flex items-center gap-2"><Store className="w-4 h-4 text-blue-500" />Con comercios:</h3>
                    <p className="text-sm mt-1">Compartimos su nombre y teléfono con los comercios donde realiza reservas para gestionar la recogida de packs.</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <h3 className="font-semibold flex items-center gap-2"><Server className="w-4 h-4 text-purple-500" />Proveedores de servicios:</h3>
                    <p className="text-sm mt-1">Compartimos datos con proveedores que nos ayudan a operar (hosting, email, análisis), siempre bajo acuerdos de confidencialidad.</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <h3 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-yellow-500" />Obligaciones legales:</h3>
                    <p className="text-sm mt-1">Podemos compartir información si es requerido por ley o para proteger derechos y seguridad.</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section id="proteccion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Lock className="w-6 h-6 text-primary" />
                  4. Protección de Datos
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Implementamos medidas de seguridad técnicas y organizativas para proteger su información:</p>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><Lock className="w-5 h-5 text-green-500" />Encriptación SSL/TLS para todas las comunicaciones</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><Key className="w-5 h-5 text-green-500" />Almacenamiento seguro de contraseñas (hash + salt)</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><Shield className="w-5 h-5 text-green-500" />Acceso restringido a datos personales</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><Eye className="w-5 h-5 text-green-500" />Monitoreo continuo de vulnerabilidades</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><Database className="w-5 h-5 text-green-500" />Copias de seguridad encriptadas</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10"><UserCheck className="w-5 h-5 text-green-500" />Autenticación de dos factores (próximamente)</div>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm">🔒 <strong>Certificaciones:</strong> Nuestra infraestructura cumple con estándares internacionales de seguridad (SOC 2, ISO 27001) a través de nuestros proveedores Supabase y Vercel.</p>
                </div>
              </div>
            </motion.section>

            <motion.section id="derechos" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-primary" />
                  5. Derechos ARCO
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">En cumplimiento con la <strong>Ley Orgánica de Protección de Datos e Infogobierno de Venezuela</strong> y legislaciones similares (LGPD en Brasil, Ley 1581 en Colombia, etc.), usted tiene derecho a:</p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100">
                    <h3 className="font-bold text-primary flex items-center gap-2"><Eye className="w-4 h-4" />Acceso</h3>
                    <p className="text-sm mt-1">Conocer qué datos tenemos sobre usted y cómo los utilizamos.</p>
                  </div>
                  <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100">
                    <h3 className="font-bold text-primary flex items-center gap-2"><FileText className="w-4 h-4" />Rectificación</h3>
                    <p className="text-sm mt-1">Corregir datos incorrectos o incompletos.</p>
                  </div>
                  <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100">
                    <h3 className="font-bold text-primary flex items-center gap-2"><Trash2 className="w-4 h-4" />Cancelación</h3>
                    <p className="text-sm mt-1">Solicitar la eliminación de sus datos.</p>
                  </div>
                  <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-100">
                    <h3 className="font-bold text-primary flex items-center gap-2"><XCircle className="w-4 h-4" />Oposición</h3>
                    <p className="text-sm mt-1">Oponerse al uso de sus datos para fines específicos.</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 rounded-lg bg-primary/10 text-center">
                  <p className="font-semibold">📧 Para ejercer tus derechos ARCO, contacta a: <strong>datos@paporla.com</strong></p>
                  <p className="text-xs mt-1">Respondemos todas las solicitudes en un plazo máximo de 15 días hábiles</p>
                </div>
              </div>
            </motion.section>

            <motion.section id="cookies" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Cookie className="w-6 h-6 text-primary" />
                  6. Uso de Cookies
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Utilizamos cookies y tecnologías similares para mejorar su experiencia. Para más detalles sobre qué cookies usamos y cómo gestionarlas, consulte nuestra <a href="/legal/cookies" className="text-primary hover:underline">Política de Cookies específica</a>.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-green-500"></span><strong>Esenciales:</strong> Autenticación y reservas</div>
                  <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-blue-500"></span><strong>Preferencias:</strong> Modo oscuro, idioma</div>
                  <div className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-yellow-500"></span><strong>Analíticas:</strong> Google Analytics</div>
                </div>
              </div>
            </motion.section>

            <motion.section id="retencion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  7. Retención de Datos
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Conservamos sus datos personales mientras su cuenta esté activa. Tras la cancelación de su cuenta:</p>
                <ul className="list-none mt-3 space-y-2">
                  <li className="flex items-start gap-2"><Clock className="w-4 h-4 text-primary mt-0.5" />Datos de reservas: <strong>2 años</strong> (requisitos fiscales y legales)</li>
                  <li className="flex items-start gap-2"><Trash2 className="w-4 h-4 text-primary mt-0.5" />Datos de perfil: <strong>Eliminamos dentro de 30 días</strong></li>
                  <li className="flex items-start gap-2"><Mail className="w-4 h-4 text-primary mt-0.5" />Comunicaciones: <strong>1 año</strong></li>
                  <li className="flex items-start gap-2"><Database className="w-4 h-4 text-primary mt-0.5" />Datos anonimizados: <strong>Pueden conservarse indefinidamente</strong> para análisis estadísticos</li>
                </ul>
              </div>
            </motion.section>

            <motion.section id="menores" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  8. Privacidad de Menores
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Paporla no está dirigida a menores de 18 años. No recopilamos conscientemente información de personas menores de edad. Si descubrimos que hemos recopilado datos de un menor sin consentimiento parental, los eliminaremos inmediatamente.</p>
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm">⚠️ <strong>Reporte:</strong> Si eres padre/tutor y crees que tu hijo menor ha proporcionado datos en Paporla, contáctanos a <strong>datos@paporla.com</strong></p>
                </div>
              </div>
            </motion.section>

            <motion.section id="transferencias" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Globe className="w-6 h-6 text-primary" />
                  9. Transferencias Internacionales
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Sus datos pueden ser procesados en servidores ubicados en diferentes países (Estados Unidos, Brasil, Unión Europea). En todos los casos:</p>
                <ul className="list-none mt-3 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Garantizamos un nivel adecuado de protección</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Cumplimos con las leyes de protección de datos aplicables</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5" />Utilizamos acuerdos de transferencia estandarizados</li>
                </ul>
              </div>
            </motion.section>

            <motion.section id="notificaciones" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Bell className="w-6 h-6 text-primary" />
                  10. Notificaciones
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Con tu consentimiento, podemos enviarte:</p>
                <ul className="list-none mt-3 space-y-2">
                  <li className="flex items-start gap-2"><Mail className="w-4 h-4 text-primary mt-0.5" />Correos electrónicos sobre tu reserva y estado</li>
                  <li className="flex items-start gap-2"><Bell className="w-4 h-4 text-primary mt-0.5" />Notificaciones push sobre ofertas y novedades</li>
                  <li className="flex items-start gap-2"><MessageCircle className="w-4 h-4 text-primary mt-0.5" />Mensajes de WhatsApp (solo si lo autorizas)</li>
                </ul>
                <p className="mt-3">Puedes darte de baja en cualquier momento desde la configuración de tu cuenta o mediante el enlace en cada comunicación.</p>
              </div>
            </motion.section>

            <motion.section id="actualizaciones" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-primary" />
                  11. Actualizaciones
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Actualizaremos esta política periódicamente. Los cambios significativos se comunicarán por email o mediante un aviso destacado en la plataforma. La fecha de la última actualización siempre estará visible al inicio del documento.</p>
                <div className="mt-4 p-4 rounded-lg bg-primary/5 text-center">
                  <p className="text-sm">📋 <strong>Historial de versiones:</strong> Puedes consultar versiones anteriores de esta política solicitándolas a datos@paporla.com</p>
                </div>
              </div>
            </motion.section>

            <motion.section id="contacto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Mail className="w-6 h-6 text-primary" />
                  12. Contacto
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Si tienes preguntas sobre esta política o sobre tus datos personales:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><Mail className="w-5 h-5 text-primary" />📧 <strong>Email:</strong> <a href="mailto:datos@paporla.com" className="text-primary hover:underline">datos@paporla.com</a></div>
                  <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><MapPin className="w-5 h-5 text-primary" />📍 <strong>Dirección:</strong> Caracas, Venezuela (Oficina de Protección de Datos)</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><Phone className="w-5 h-5 text-primary" />📞 <strong>Teléfono:</strong> <a href="tel:+582125551234" className="text-primary hover:underline">+58 212 555 1234</a> (Ext. 158)</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg dark:bg-white/5 bg-gray-100"><Globe className="w-5 h-5 text-primary" />🌐 <strong>Formulario:</strong> <a href="/contacto" className="text-primary hover:underline">paporla.com/contacto</a></div>
                </div>
              </div>
            </motion.section>

            {/* Footer del documento */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="glass-card rounded-2xl p-6 backdrop-blur-sm text-center"
            >
              <div className="flex flex-wrap justify-center gap-4 mb-4">
                <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" />Protegemos tus datos</div>
                <div className="flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" />Privacidad sostenible</div>
                <div className="flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Compromiso ético</div>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <a href="/legal/terminos" className="flex items-center gap-1 text-primary hover:underline"><FileText className="w-3 h-3" />Términos</a>
                <span className="text-gray-500">|</span>
                <a href="/legal/cookies" className="flex items-center gap-1 text-primary hover:underline"><Cookie className="w-3 h-3" />Cookies</a>
                <span className="text-gray-500">|</span>
                <a href="/contacto" className="flex items-center gap-1 text-primary hover:underline"><Mail className="w-3 h-3" />Contacto DPO</a>
              </div>
              <p className="text-xs text-gray-500 mt-4">© {new Date().getFullYear()} Paporla - Todos los derechos reservados. Delegado de Protección de Datos: datos@paporla.com</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}