'use client'

import Link from 'next/link'
import { CheckCircle2, Store, ShieldCheck, Package } from 'lucide-react'
import Button from '@/components/ui/Button'

/**
 * Checklist "Primeros pasos" del comercio: el onboarding real.
 *
 * Muestra los 3 pasos que separan a un comercio recién registrado de su
 * primer pack publicado, con el estado VIVO de cada uno (derivado de datos
 * reales, nunca de localStorage: no hay nada que "descartar" ni bug posible
 * de claves de dismiss). Se oculta sola cuando el comercio ya publicó su
 * primer pack, porque en ese momento ya no hay nada que enseñar.
 *
 * Regla de diseño: cada estado responde "¿qué hago ahora?" con UN solo
 * botón primario (el del paso actual). Los pasos futuros se ven —para que
 * el comerciante sepa cuánto camino queda— pero no compiten por atención.
 */

interface ChecklistShop {
  name: string
  verified: boolean
}

interface Props {
  /** Comercio del usuario, o null si todavía no completó el perfil. */
  shop: ChecklistShop | null
  /** true cuando el comercio ya tiene al menos un pack (no archivado). */
  hasPacks: boolean
}

type StepStatus = 'done' | 'current' | 'pending'

interface StepView {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  status: StepStatus
}

export default function FirstStepsChecklist({ shop, hasPacks }: Props) {
  // Estado derivado de datos reales: perfil → revisión → primer pack.
  const profileDone = shop !== null
  const verifiedDone = shop?.verified === true
  const packDone = verifiedDone && hasPacks

  // Terminado el camino, el checklist desaparece para siempre.
  if (packDone) return null

  const steps: StepView[] = [
    {
      icon: Store,
      title: 'Completa el perfil de tu comercio',
      description: 'Nombre, dirección y horario. Es lo que verán tus clientes.',
      status: profileDone ? 'done' : 'current',
    },
    {
      icon: ShieldCheck,
      title: 'Nuestro equipo revisa tu comercio',
      description:
        profileDone && !verifiedDone
          ? 'Estamos revisando tus datos. Te avisaremos cuando esté aprobado; no tienes que hacer nada.'
          : 'Revisamos cada comercio para que la comunidad compre con confianza.',
      status: verifiedDone ? 'done' : profileDone ? 'current' : 'pending',
    },
    {
      icon: Package,
      title: 'Publica tu primer pack',
      description: 'Elige una plantilla, ajusta el precio y listo: tus excedentes del día, a la venta.',
      status: verifiedDone ? 'current' : 'pending',
    },
  ]

  const completedCount = steps.filter((s) => s.status === 'done').length

  return (
    <section
      aria-label="Primeros pasos"
      className="glass-card rounded-2xl border dark:border-white/10 border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold dark:text-white text-gray-900">Primeros pasos</h2>
        <span className="text-xs font-medium dark:text-gray-400 text-gray-500">{completedCount} de 3</span>
      </div>
      <p className="text-sm dark:text-gray-400 text-gray-600 mb-5">Tres pasos y tu comercio estará vendiendo packs.</p>

      <ol className="space-y-4">
        {steps.map((step, idx) => {
          const isDone = step.status === 'done'
          const isCurrent = step.status === 'current'
          return (
            <li key={idx} className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? 'bg-primary/15 text-primary'
                    : isCurrent
                      ? 'bg-primary text-white'
                      : 'dark:bg-white/5 bg-gray-100 dark:text-gray-500 text-gray-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
              </div>
              <div className="min-w-0 pt-1">
                <p
                  className={`text-sm font-semibold ${
                    isDone
                      ? 'dark:text-gray-400 text-gray-500 line-through decoration-primary/40'
                      : isCurrent
                        ? 'dark:text-white text-gray-900'
                        : 'dark:text-gray-500 text-gray-400'
                  }`}
                >
                  {step.title}
                </p>
                {!isDone && (
                  <p
                    className={`text-xs mt-0.5 ${isCurrent ? 'dark:text-gray-400 text-gray-600' : 'dark:text-gray-600 text-gray-400'}`}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* UN solo botón: el del paso actual. La revisión no tiene botón porque
          no depende del comercio (solo un enlace discreto para repasar datos). */}
      <div className="mt-6">
        {!profileDone && (
          <Link href="/business/profile" className="block w-full sm:w-auto sm:inline-block">
            <Button className="w-full sm:w-auto">Completar mi perfil</Button>
          </Link>
        )}
        {profileDone && !verifiedDone && (
          <Link href="/business/profile" className="text-sm text-primary hover:underline">
            Revisar los datos de mi comercio
          </Link>
        )}
        {verifiedDone && !hasPacks && (
          <Link href="/business/packs/new" className="block w-full sm:w-auto sm:inline-block">
            <Button className="w-full sm:w-auto">Crear mi primer pack</Button>
          </Link>
        )}
      </div>
    </section>
  )
}
