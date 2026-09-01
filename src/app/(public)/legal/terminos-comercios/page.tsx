import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos y Condiciones para Comercios',
  description:
    'Términos que regulan la relación entre Paporla y los comercios que publican packs de excedentes alimentarios en Chile.',
}

/**
 * Términos y Condiciones para Comercios — versión 2026-09-01 (v1).
 *
 * Esta página es el `content_url` del documento `merchant_terms` publicado en
 * `legal_documents` (migración 0040). La fuente versionada del texto es
 * `docs/legal/terminos-comercios-v1.md`: si se cambia el texto aquí, hay que
 * publicar una versión nueva del documento en la base (nunca editar la
 * publicada, porque las aceptaciones apuntan a una versión exacta).
 *
 * Es un Server Component a propósito: texto legal estático, indexable,
 * sin JavaScript de cliente.
 */

const VERSION = '2026-09-01'

interface TermsSection {
  id: string
  title: string
  paragraphs: string[]
  items?: string[]
}

const SECTIONS: TermsSection[] = [
  {
    id: 'objeto',
    title: '1. Objeto y aceptación',
    paragraphs: [
      'Estos términos regulan la relación entre Paporla (la «Plataforma») y el comercio que publica packs de excedentes alimentarios (el «Comercio»). Al marcar la casilla de aceptación y enviar su comercio a revisión, el Comercio declara haber leído y aceptado íntegramente estos términos. La aceptación queda registrada con fecha, versión del documento y usuario que la otorgó.',
    ],
  },
  {
    id: 'rol',
    title: '2. Rol de Paporla',
    paragraphs: [
      'Paporla es una plataforma tecnológica que actúa como intermediaria entre el Comercio y el consumidor final. El contrato de compraventa de los packs se celebra directamente entre el Comercio y el consumidor. Paporla no elabora, manipula, almacena ni transporta alimentos, y no es parte vendedora en la operación. Este rol se informa al consumidor antes del perfeccionamiento de cada compra, conforme a la Ley 19.496 y su Reglamento de Comercio Electrónico.',
    ],
  },
  {
    id: 'verificacion',
    title: '3. Alta y verificación del Comercio',
    paragraphs: ['Para operar en la Plataforma, el Comercio debe:'],
    items: [
      'Declarar el RUT de la empresa o del titular, que Paporla podrá cotejar con los registros públicos del Servicio de Impuestos Internos (SII).',
      'Declarar el número de su resolución sanitaria vigente emitida por la SEREMI de Salud competente, exigible a todo establecimiento que elabora, almacena o expende alimentos (D.S. 977/96, Reglamento Sanitario de los Alimentos).',
      'Entregar información veraz, completa y actualizada de su negocio.',
    ],
  },
  {
    id: 'verificacion-2',
    title: '',
    paragraphs: [
      'Paporla puede rechazar o revertir la verificación de un Comercio si los datos declarados no superan el cotejo, si la resolución sanitaria pierde vigencia o si detecta información falsa. La verificación de Paporla no sustituye ni certifica las autorizaciones sanitarias o municipales, cuya obtención y vigencia son de responsabilidad exclusiva del Comercio.',
    ],
  },
  {
    id: 'obligaciones',
    title: '4. Obligaciones del Comercio',
    paragraphs: ['El Comercio se obliga a:'],
    items: [
      'Cumplir en todo momento la normativa sanitaria aplicable, en particular el D.S. 977/96, incluida la prohibición de vender alimentos alterados, contaminados, adulterados o falsificados.',
      'Entregar packs aptos para el consumo, en condiciones higiénicas adecuadas y correctamente conservados hasta el retiro.',
      'Informar al consumidor, al momento del retiro, sobre alérgenos y condiciones de conservación y consumo cuando corresponda.',
      'Mantener vigentes su patente municipal, su inicio de actividades ante el SII con giro coherente y su resolución sanitaria.',
      'Publicar información veraz sobre el contenido orientativo, el precio y la disponibilidad de sus packs, y mantener el stock actualizado.',
      'Honrar toda reserva confirmada dentro de la ventana de retiro publicada.',
    ],
  },
  {
    id: 'packs',
    title: '5. Packs y precios',
    paragraphs: [
      'Los packs son lotes de excedentes alimentarios de contenido variable («pack sorpresa»), descritos por categoría y valor estimado. El precio publicado es el precio final que paga el consumidor, impuestos incluidos. El Comercio fija sus precios libremente y es responsable de su exactitud.',
    ],
  },
  {
    id: 'reservas',
    title: '6. Reservas, confirmación y retiro',
    paragraphs: [
      'Las reservas se gestionan a través de la Plataforma. Durante el piloto, el Comercio confirma manualmente cada reserva desde su panel. El consumidor retira el pack en el local del Comercio dentro de la ventana de retiro publicada, identificándose con su código de retiro. Un pack puede reservarse hasta 15 minutos antes del cierre de su ventana de retiro.',
    ],
  },
  {
    id: 'cancelaciones',
    title: '7. Cancelaciones y no presentación',
    paragraphs: [
      'El consumidor puede cancelar sin costo hasta 120 minutos antes del inicio de la ventana de retiro. Las reservas no retiradas dentro de la ventana se registran como no presentación; durante el piloto este registro es informativo y no genera penalizaciones automáticas.',
    ],
  },
  {
    id: 'retracto',
    title: '8. Derecho a retracto',
    paragraphs: [
      'Por tratarse de alimentos perecibles que pueden deteriorarse o caducar con rapidez, los packs están excluidos del derecho a retracto del artículo 3 bis de la Ley 19.496. La Plataforma informa esta exclusión al consumidor de manera destacada antes de confirmar cada reserva.',
    ],
  },
  {
    id: 'comisiones',
    title: '9. Comisiones y pagos',
    paragraphs: [
      'Durante el piloto, la Plataforma no cobra comisiones al Comercio y los pagos se realizan directamente en el local al momento del retiro. La activación de pagos en línea y el esquema de comisiones se acordarán mediante un anexo a estos términos, que se comunicará con al menos 15 días de anticipación.',
    ],
  },
  {
    id: 'datos',
    title: '10. Datos personales',
    paragraphs: [
      'Cada parte es responsable del tratamiento de datos personales que realiza. El Comercio solo puede usar los datos de los consumidores que le entrega la Plataforma (nombre y código de reserva) para gestionar la entrega del pack, y debe abstenerse de usarlos con fines comerciales propios. Ambas partes se obligan a cumplir la normativa chilena de protección de datos, incluida la Ley 21.719 desde su entrada en vigencia.',
    ],
  },
  {
    id: 'contenidos',
    title: '11. Contenidos y propiedad intelectual',
    paragraphs: [
      'El Comercio autoriza a Paporla a usar su nombre, logotipo y fotografías que suba a la Plataforma, con el único fin de mostrar y promocionar su perfil y sus packs dentro de la Plataforma y en los canales oficiales de Paporla. El Comercio garantiza que dispone de los derechos sobre los contenidos que publica.',
    ],
  },
  {
    id: 'suspension',
    title: '12. Suspensión y término',
    paragraphs: [
      'Paporla puede suspender o dar de baja a un Comercio, previa comunicación del motivo, en caso de incumplimiento de estos términos, pérdida de autorizaciones, reclamos reiterados y fundados de consumidores o uso fraudulento de la Plataforma. El Comercio puede cesar su operación en cualquier momento, debiendo honrar las reservas ya confirmadas o cancelarlas informando al consumidor.',
    ],
  },
  {
    id: 'responsabilidad',
    title: '13. Responsabilidad',
    paragraphs: [
      'El Comercio es exclusivo responsable de la calidad, inocuidad y estado de los alimentos que entrega, así como del cumplimiento de sus obligaciones sanitarias, tributarias y municipales. Paporla responde por el funcionamiento de la Plataforma conforme a la normativa aplicable, y no asume responsabilidad por los productos entregados por el Comercio, sin perjuicio de los derechos que la ley otorga a los consumidores.',
    ],
  },
  {
    id: 'modificaciones',
    title: '14. Modificaciones',
    paragraphs: [
      'Paporla puede modificar estos términos comunicándolo al Comercio con al menos 15 días de anticipación. Las versiones se identifican con fecha y número, y cada nueva versión requiere aceptación expresa del Comercio para seguir publicando.',
    ],
  },
  {
    id: 'jurisdiccion',
    title: '15. Ley aplicable y jurisdicción',
    paragraphs: [
      'Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales ordinarios de justicia de Santiago de Chile, sin perjuicio de la competencia que la ley asigne a otros tribunales u organismos como SERNAC.',
    ],
  },
]

export default function TerminosComerciosPage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-16">
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <span className="text-sm font-medium">Documento Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Términos y Condiciones para Comercios</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
              Condiciones que rigen la publicación de packs en Paporla
            </p>
            <p className="mt-6 text-sm text-gray-500">
              Versión {VERSION} · Aplica para Chile ·{' '}
              <Link href="/legal/terminos" className="text-primary hover:underline">
                Ver términos generales
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="glass-card rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                {section.title && <h2 className="text-xl md:text-2xl font-bold mb-4 text-gradient">{section.title}</h2>}
                <div className="space-y-3 dark:text-gray-300 text-gray-700 leading-relaxed text-sm md:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul className="list-disc pl-5 space-y-2">
                      {section.items.map((item) => (
                        <li key={item.slice(0, 40)}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
