'use client';

import { motion } from 'framer-motion';
import { 
  FileText, Shield, CheckCircle, AlertCircle, Users, 
  Store, CreditCard, Calendar, Clock, Phone, Mail, 
  MapPin, Heart, Leaf, Scale, Award, Bell, XCircle
} from 'lucide-react';

export default function TerminosPage() {
  const sections = [
    { id: 'aceptacion', title: '1. Aceptación de los Términos', icon: FileText },
    { id: 'definiciones', title: '2. Definiciones', icon: Shield },
    { id: 'usuarios', title: '3. Obligaciones del Usuario', icon: Users },
    { id: 'comercios', title: '4. Obligaciones del Comercio', icon: Store },
    { id: 'reservas', title: '5. Política de Reservas', icon: Calendar },
    { id: 'pagos', title: '6. Pagos y Reembolsos', icon: CreditCard },
    { id: 'cancelaciones', title: '7. Cancelaciones', icon: XCircle },
    { id: 'responsabilidad', title: '8. Limitación de Responsabilidad', icon: AlertCircle },
    { id: 'privacidad', title: '9. Privacidad y Datos', icon: Shield },
    { id: 'modificaciones', title: '10. Modificaciones', icon: Bell },
    { id: 'jurisdiccion', title: '11. Jurisdicción', icon: Scale },
    { id: 'contacto', title: '12. Contacto', icon: Phone },
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
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Documento Legal</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-gradient">Términos y Condiciones</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
              Lee atentamente los términos que rigen el uso de nuestra plataforma
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />Última actualización: 15 Enero 2025</div>
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />Aplica para Venezuela y Latinoamérica</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Índice */}
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
            <motion.section id="aceptacion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  1. Aceptación de los Términos
                </h2>
                <div className="space-y-3 dark:text-gray-300 text-gray-700 leading-relaxed">
                  <p>Al acceder y utilizar la plataforma Paporla (incluyendo el sitio web y aplicaciones móviles), usted acepta cumplir con estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.</p>
                  <p>Estos términos constituyen un acuerdo legal entre usted y Paporla, aplicable tanto en Venezuela como en los demás países de Latinoamérica donde operemos.</p>
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mt-4">
                    <p className="text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /><span>Al registrarte, confirmas que tienes al menos 18 años de edad o cuentas con autorización parental para utilizar nuestros servicios.</span></p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section id="definiciones" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  2. Definiciones
                </h2>
                <div className="grid gap-4">
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Paporla:</strong> Plataforma tecnológica que conecta comercios con excedentes alimentarios y usuarios interesados en rescatarlos.</div>
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Pack:</strong> Producto o conjunto de productos alimenticios ofrecidos por un comercio a través de la plataforma.</div>
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Comercio:</strong> Establecimiento comercial registrado en Paporla que ofrece packs.</div>
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Usuario:</strong> Persona natural que utiliza la plataforma para reservar packs.</div>
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Reserva:</strong> Acción mediante la cual un usuario aparta un pack para su recogida.</div>
                  <div className="p-3 rounded-lg dark:bg-white/5 bg-gray-100"><strong className="text-primary">Código de recogida:</strong> Identificador único generado al reservar, necesario para retirar el pack.</div>
                </div>
              </div>
            </motion.section>

            <motion.section id="usuarios" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  3. Obligaciones del Usuario
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Como usuario de Paporla, usted se compromete a:</p>
                <ul className="list-none space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Proporcionar información veraz, precisa y actualizada durante el registro.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Mantener la confidencialidad de sus credenciales de acceso.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />No realizar reservas fraudulentas o sin intención real de recoger el pack.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Respetar los horarios de recogida establecidos por cada comercio.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />No revender los packs adquiridos a través de la plataforma.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Reportar cualquier problema o irregularidad a través de los canales oficiales.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Mantener actualizada su información de contacto.</li>
                </ul>
              </div>
            </motion.section>

            <motion.section id="comercios" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Store className="w-6 h-6 text-primary" />
                  4. Obligaciones del Comercio
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Los comercios registrados en Paporla se comprometen a:</p>
                <ul className="list-none space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Ofrecer productos en condiciones aptas para el consumo humano.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Respetar las fechas y horarios de recogida acordados.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Mantener actualizada la información de sus packs (disponibilidad, precios, horarios).</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />No discriminar a ningún usuario por ningún motivo.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Cumplir con todas las normas sanitarias vigentes en su localidad.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Proporcionar un ambiente seguro para la recogida de los packs.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Responder prontamente a las consultas y solicitudes de los usuarios.</li>
                </ul>
              </div>
            </motion.section>

            <motion.section id="reservas" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-primary" />
                  5. Política de Reservas
                </h2>
                <p className="dark:text-gray-300 text-gray-700 mb-3">Las reservas en Paporla se realizan de forma gratuita y se confirman de inmediato. Al realizar una reserva, usted acepta:</p>
                <ul className="list-none space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Recoger el pack dentro del horario establecido por el comercio.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Presentar el código de recogida generado por la plataforma.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Pagar directamente al comercio el monto acordado del pack.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Cancelar la reserva con al menos 2 horas de anticipación si no puede recogerla.</li>
                </ul>
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm flex items-start gap-2"><Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" /><span>El código de recogida es personal e intransferible. No compartas este código con nadie.</span></p>
                </div>
              </div>
            </motion.section>

            <motion.section id="pagos" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  6. Pagos y Reembolsos
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Paporla no procesa pagos directamente. El pago del pack se realiza en efectivo directamente al comercio al momento de la recogida. En caso de que un pack no esté disponible o no cumpla con lo ofrecido, el usuario no está obligado a realizar el pago y debe reportar la situación a Paporla para la correspondiente sanción al comercio.</p>
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm">💰 <strong>Consejo:</strong> Lleva el cambio exacto para agilizar el proceso de recogida.</p>
                </div>
              </div>
            </motion.section>

            <motion.section id="cancelaciones" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-primary" />
                  7. Cancelaciones
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Los usuarios pueden cancelar sus reservas hasta 2 horas antes del horario límite de recogida. Las cancelaciones tardías o no presentarse sin cancelar afectarán la reputación del usuario y pueden resultar en la suspensión temporal o permanente de la cuenta.</p>
                <p className="dark:text-gray-300 text-gray-700 mt-3">Los comercios pueden cancelar reservas por causas de fuerza mayor, debiendo notificar inmediatamente a los usuarios afectados.</p>
              </div>
            </motion.section>

            <motion.section id="responsabilidad" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-primary" />
                  8. Limitación de Responsabilidad
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Paporla actúa únicamente como intermediario tecnológico entre comercios y usuarios. No somos responsables por:</p>
                <ul className="list-none space-y-2 mt-3">
                  <li className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />La calidad, cantidad o seguridad de los productos ofrecidos por los comercios.</li>
                  <li className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />Retrasos o problemas en la recogida causados por los comercios.</li>
                  <li className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />Daños derivados del consumo de productos adquiridos a través de la plataforma.</li>
                  <li className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />Interrupciones del servicio por causas técnicas o de fuerza mayor.</li>
                </ul>
              </div>
            </motion.section>

            <motion.section id="privacidad" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  9. Privacidad y Protección de Datos
                </h2>
                <p className="dark:text-gray-300 text-gray-700">En cumplimiento de la Ley Orgánica de Protección de Datos e Infogobierno de Venezuela y legislaciones similares en Latinoamérica, Paporla:</p>
                <ul className="list-none space-y-2 mt-3">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Recopila únicamente los datos necesarios para el funcionamiento de la plataforma.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />No comparte datos personales con terceros sin consentimiento explícito.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Implementa medidas de seguridad para proteger la información de los usuarios.</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />Permite a los usuarios acceder, rectificar y eliminar sus datos personales.</li>
                </ul>
                <p className="mt-3">Para más información, consulte nuestra <a href="/legal/privacidad" className="text-primary hover:underline">Política de Privacidad</a>.</p>
              </div>
            </motion.section>

            <motion.section id="modificaciones" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Bell className="w-6 h-6 text-primary" />
                  10. Modificaciones
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Paporla se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma. Es responsabilidad del usuario revisar periódicamente los términos actualizados.</p>
              </div>
            </motion.section>

            <motion.section id="jurisdiccion" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Scale className="w-6 h-6 text-primary" />
                  11. Jurisdicción y Ley Aplicable
                </h2>
                <p className="dark:text-gray-300 text-gray-700">Para operaciones en Venezuela, estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia será sometida a los tribunales competentes de Caracas.</p>
                <p className="dark:text-gray-300 text-gray-700 mt-3">Para operaciones en otros países de Latinoamérica, se aplicarán las leyes locales correspondientes y la jurisdicción de los tribunales de cada país.</p>
              </div>
            </motion.section>

            <motion.section id="contacto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gradient flex items-center gap-3">
                  <Phone className="w-6 h-6 text-primary" />
                  12. Contacto
                </h2>
                <div className="space-y-2">
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email legal: <a href="mailto:legal@paporla.com" className="text-primary hover:underline">legal@paporla.com</a></p>
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Dirección: Caracas, Venezuela</p>
                  <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Web: <a href="/contacto" className="text-primary hover:underline">paporla.com/contacto</a></p>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
                  <p className="text-sm text-center">📄 <strong>Nota final:</strong> Estos términos están diseñados para proteger tanto a usuarios como a comercios, promoviendo una comunidad de consumo responsable y reducción del desperdicio alimentario.</p>
                </div>
              </div>
            </motion.section>

            {/* Footer del documento */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="glass-card rounded-2xl p-6 backdrop-blur-sm text-center"
            >
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <a href="/legal/privacidad" className="flex items-center gap-2 text-primary hover:underline"><Shield className="w-4 h-4" />Política de Privacidad</a>
                <span className="text-gray-500">|</span>
                <a href="/legal/cookies" className="flex items-center gap-2 text-primary hover:underline"><Cookie className="w-4 h-4" />Política de Cookies</a>
                <span className="text-gray-500">|</span>
                <a href="/contacto" className="flex items-center gap-2 text-primary hover:underline"><Mail className="w-4 h-4" />Contacto</a>
              </div>
              <p className="text-xs text-gray-500 mt-4">© {new Date().getFullYear()} Paporla - Rescate Alimentario. Todos los derechos reservados.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes auxiliares que faltaban
function Globe(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function Cookie(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>; }