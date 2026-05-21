'use client';

import { motion } from 'framer-motion';

export default function LegalBasesPage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="container mx-auto px-4 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Bases Legales</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Marco legal que regula Paporla en Venezuela
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
              Última actualización: 15 de Enero de 2025
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">1. Base Constitucional</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Paporla se fundamenta en los siguientes artículos de la 
              <strong> Constitución de la República Bolivariana de Venezuela</strong>:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>Artículo 305:</strong> Promueve la seguridad alimentaria y la soberanía 
                agroalimentaria como parte fundamental del desarrollo económico y social.
              </li>
              <li>
                <strong>Artículo 112:</strong> Garantiza el derecho al libre ejercicio de actividades 
                económicas y comerciales, dentro de un marco de justicia social.
              </li>
              <li>
                <strong>Artículo 118:</strong> Reconoce el derecho de los trabajadores y la comunidad 
                a participar en beneficios económicos e iniciativas de desarrollo local.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">2. Ley Orgánica de Protección al Consumidor</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Nos regimos por la <strong>Ley Orgánica de Protección al Consumidor y Usuario</strong> 
              (Gaceta Oficial N° 39.358 del 18 de noviembre de 2011), que establece:
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
                <strong> INDEPABIS (Instituto para la Defensa de las Personas en el Acceso a los Bienes y Servicios)</strong> 
                o a nuestro equipo de soporte en <strong>soporte@paporla.com</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">3. Ley Infogobierno y Protección de Datos</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              En cumplimiento de la <strong>Ley Orgánica de Protección de Datos Personales e Infogobierno</strong> 
              (Gaceta Oficial N° 39.060 del 13 de enero de 2011), Paporla:
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
                🔒 <strong>Tus derechos ARCO:</strong> Puedes ejercer tus derechos de Acceso, Rectificación, 
                Cancelación y Oposición enviando un email a <strong>datos@paporla.com</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">4. Ley sobre Mensajes de Datos y Firmas Electrónicas</h2>
            <p className="dark:text-gray-300 text-gray-700 leading-relaxed">
              Nos regimos por la <strong>Ley sobre Mensajes de Datos y Firmas Electrónicas</strong> 
              (Gaceta Oficial N° 37.148 del 28 de febrero de 2001), que otorga:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 dark:text-gray-300 text-gray-700">
              <li>
                <strong>Valor legal:</strong> Los mensajes de datos (reservas, confirmaciones) tienen el 
                mismo valor que los documentos físicos.
              </li>
              <li>
                <strong>Integridad:</strong> Implementamos sistemas que garantizan la integridad de las 
                transacciones electrónicas.
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
                <strong>Reglamento General de la Ley de Salud:</strong> Normas sanitarias para 
                establecimientos de alimentos.
              </li>
              <li>
                <strong>Normas COVENIN:</strong> Estándares venezolanos para manipulación y conservación 
                de alimentos.
              </li>
              <li>
                <strong>Permiso sanitario:</strong> Todo comercio debe contar con registro sanitario vigente.
              </li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                ⚠️ <strong>Responsabilidad:</strong> Paporla verifica la documentación sanitaria inicial, 
                pero los comercios son los únicos responsables ante las autoridades sanitarias por el 
                cumplimiento continuo de las normas.
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
              Al expandirnos a otros países de Latinoamérica, Paporla se registrará ante las autoridades 
              locales (RNE, CNPD, ARCSA, etc.) y adaptará sus términos a la legislación específica de 
              cada jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gradient mb-4">7. Contacto Legal</h2>
            <div className="space-y-2 dark:text-gray-300 text-gray-700">
              <p>📧 <strong>Email:</strong> legal@paporla.com</p>
              <p>📍 <strong>Dirección:</strong> Caracas, Venezuela</p>
              <p>🌐 <strong>Web:</strong> <a href="/contacto" className="text-primary hover:underline">paporla.com/contacto</a></p>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm dark:text-gray-300 text-gray-700">
                📄 <strong>Nota:</strong> Este documento está en cumplimiento con el marco legal venezolano. 
                Para operaciones internacionales, se aplicarán las leyes locales correspondientes.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}