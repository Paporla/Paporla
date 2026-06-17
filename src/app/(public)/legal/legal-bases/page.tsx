'use client'

import { motion } from 'framer-motion'

export default function LegalBasesPage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="container mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Bases Legales</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">Marco legal que regula Paporla en Chile</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">Última actualización: 15 de Enero de 2025</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">1. Base Constitucional</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Paporla se fundamenta en los siguientes cuerpos legales de la
              <strong> República de Chile</strong>:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>Constitución Política de Chile:</strong> Garantiza el derecho a la seguridad alimentaria y al
                libre ejercicio de actividades económicas.
              </li>
              <li>
                <strong>Código de Comercio:</strong> Regula las transacciones comerciales electrónicas y la relación
                entre comercios y consumidores.
              </li>
              <li>
                <strong>Ley 19.496:</strong> Ley de Protección de los Derechos de los Consumidores, que establece los
                derechos y obligaciones en las relaciones de consumo.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">2. Ley de Protección al Consumidor</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Nos regimos por la <strong>Ley 19.496 de Protección de los Derechos de los Consumidores</strong>
              de Chile, que establece:
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">Derechos que garantizamos:</h3>
                <ul className="list-disc pl-6 space-y-1 dark:text-gray-300 text-gray-700">
                  <li>Información veraz y oportuna sobre los packs ofrecidos.</li>
                  <li>Protección contra prácticas engañosas o abusivas.</li>
                  <li>Calidad y seguridad en los productos alimenticios.</li>
                  <li>Mecanismos efectivos para resolver controversias.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">Obligaciones que exigimos:</h3>
                <ul className="list-disc pl-6 space-y-1 dark:text-gray-300 text-gray-700">
                  <li>Los comercios deben exhibir precios claros y visibles.</li>
                  <li>Las ofertas deben respetar los términos promocionados.</li>
                  <li>Los productos deben cumplir con estándares sanitarios.</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                📞 <strong>Para denuncias:</strong> Puedes contactar al
                <strong> SERNAC (Servicio Nacional del Consumidor)</strong>o a nuestro equipo de soporte en{' '}
                <strong>soporte@paporla.com</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">3. Ley de Protección de Datos</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              En cumplimiento de la <strong>Ley 19.628 de Protección de la Vida Privada</strong>
              de Chile, Paporla:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>Solo recopila datos con consentimiento explícito y para fines legítimos.</li>
              <li>Utiliza los datos exclusivamente para operar la plataforma.</li>
              <li>Solicita información estrictamente necesaria.</li>
              <li>Mantiene los datos actualizados y correctos.</li>
              <li>Implementa medidas técnicas para proteger la información.</li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                🔒 <strong>Tus derechos ARCO:</strong> Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación
                y Oposición enviando un email a <strong>datos@paporla.com</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">4. Ley de Comercio Electrónico</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Nos regimos por la <strong>Ley 19.799 de Documentos Electrónicos y Firma Electrónica</strong>
              de Chile, que otorga:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>Valor legal:</strong> Los mensajes de datos (reservas, confirmaciones) tienen el mismo valor que
                los documentos físicos.
              </li>
              <li>
                <strong>Integridad:</strong> Implementamos sistemas que garantizan la integridad de las transacciones
                electrónicas.
              </li>
              <li>
                <strong>Conservación:</strong> Los registros digitales se conservan conforme a la ley.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">5. Normativas Sanitarias</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Los comercios registrados en Paporla deben cumplir con las siguientes normativas:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>Código Sanitario de Chile:</strong> Normas sanitarias para establecimientos de alimentos (DFL
                725/1967).
              </li>
              <li>
                <strong>Reglamento Sanitario de los Alimentos (RSA):</strong> Estándares para manipulación y
                conservación de alimentos (DS 977/1996).
              </li>
              <li>
                <strong>Resolución Sanitaria:</strong> Todo comercio debe contar con resolución sanitaria vigente
                otorgada por la SEREMI de Salud.
              </li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                ⚠️ <strong>Responsabilidad:</strong> Paporla verifica la documentación sanitaria inicial, pero los
                comercios son los únicos responsables ante las autoridades sanitarias por el cumplimiento continuo de
                las normas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">6. Marco Internacional</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Paporla se alinea con los <strong>Objetivos de Desarrollo Sostenible (ODS)</strong> de la ONU:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>ODS 2 - Hambre Cero:</strong> Reducir el desperdicio alimentario.
              </li>
              <li>
                <strong>ODS 12 - Producción y Consumo Responsables:</strong> Reducción de pérdidas alimentarias.
              </li>
              <li>
                <strong>ODS 17 - Alianzas:</strong> Colaboración multisectorial.
              </li>
            </ul>
            <p className="mt-4 dark:text-gray-300 text-gray-700">
              Al expandirnos a otros países de Latinoamérica, Paporla se registrará ante las autoridades locales y
              adaptará sus términos a la legislación específica de cada jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">7. Contacto Legal</h2>
            <div className="space-y-2 dark:text-gray-300 text-gray-700">
              <p>
                📧 <strong>Email:</strong> legal@paporla.com
              </p>
              <p>
                📍 <strong>Dirección:</strong> Santiago, Chile
              </p>
              <p>
                🌐 <strong>Web:</strong>{' '}
                <a href="/contacto" className="text-primary hover:underline">
                  paporla.com/contacto
                </a>
              </p>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                📄 <strong>Nota:</strong> Este documento está en cumplimiento con el marco legal venezolano. Para
                operaciones internacionales, se aplicarán las leyes locales correspondientes.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
