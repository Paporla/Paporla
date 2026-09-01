'use client'

import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import {
  Store,
  Building2,
  MapPin,
  Clock,
  Settings,
  Image,
  Eye,
  Shield,
  Send,
  CheckCircle2,
  AlertTriangle,
  Ban,
} from 'lucide-react'
import type { ShopStatus, MissingField } from '@/lib/utils/shopReview'

export interface ProfileTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const profileTabs: ProfileTab[] = [
  { id: 'info', label: 'Información', icon: Building2 },
  { id: 'images', label: 'Imágenes', icon: Image },
  { id: 'location', label: 'Ubicación', icon: MapPin },
  { id: 'hours', label: 'Horarios', icon: Clock },
  { id: 'settings', label: 'Ajustes', icon: Settings },
]

interface BusinessProfileLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
  children: React.ReactNode
  shopName: string
  completionPercentage: number
  onPreview: () => void
  /** Estado real del comercio. Antes esto era un booleano `verified` que
   *  aplastaba los seis estados en dos, y hacía que un comercio en `draft`
   *  leyera "será revisado en 24-48 horas" sin haberlo enviado nunca. */
  status: ShopStatus
  /** Motivo del rechazo escrito por el administrador (`shops.status_reason`). */
  statusReason: string | null
  /** Campos obligatorios que siguen vacíos. Si hay alguno, el botón se desactiva. */
  missingFields: MissingField[]
  /** Hay cambios sin guardar: enviar ahora mandaría a revisión la versión antigua. */
  hasUnsavedChanges: boolean
  onSubmitForReview: () => void
  /** Lleva al comercio a la pestaña donde está el campo que falta. */
  onGoToTab: (tab: string) => void
  submitting: boolean
  /** El comercio todavía no existe en la base: no hay nada que enviar. */
  shopExists: boolean
  /**
   * Hay que aceptar los Términos para Comercios antes de enviar (0040 exige
   * la aceptación en la base; aquí se pide ANTES para no recibir un
   * MERCHANT_TERMS_NOT_ACCEPTED después de pulsar). `false` cuando ya los
   * aceptó, cuando no hay documento publicado o mientras se carga.
   */
  termsRequired: boolean
  /** Estado del checkbox de términos (vive en la página, como el resto). */
  termsChecked: boolean
  onTermsCheckedChange: (checked: boolean) => void
}

/**
 * Aviso de estado del comercio.
 *
 * Cada estado dice la verdad y ofrece exactamente la acción que corresponde:
 *  - draft      → nunca se envió. Botón "Enviar a revisión".
 *  - rejected   → se rechazó, con el motivo. Botón "Volver a enviar".
 *  - pending    → en revisión. Sin acción.
 *  - suspended  → cuenta bloqueada. Sin acción.
 *  - verified   → sin aviso.
 */
function StatusNotice({
  status,
  statusReason,
  missingFields,
  hasUnsavedChanges,
  onSubmitForReview,
  onGoToTab,
  submitting,
  shopExists,
  termsRequired,
  termsChecked,
  onTermsCheckedChange,
}: Pick<
  BusinessProfileLayoutProps,
  | 'status'
  | 'statusReason'
  | 'missingFields'
  | 'hasUnsavedChanges'
  | 'onSubmitForReview'
  | 'onGoToTab'
  | 'submitting'
  | 'shopExists'
  | 'termsRequired'
  | 'termsChecked'
  | 'onTermsCheckedChange'
>) {
  if (status === 'verified') return null

  // Comercio recién iniciado y aún sin guardar: primero hay que crearlo.
  if (!shopExists) {
    return (
      <div className="mt-4 flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
        <Store className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Completa tu perfil.</span> Guarda los datos de tu comercio para poder enviarlo
          a revisión.
        </p>
      </div>
    )
  }

  if (status === 'pending_review') {
    return (
      <div className="mt-4 flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          <span className="font-semibold">En revisión.</span> Estamos revisando tu comercio, normalmente en 24-48 horas.
          Te avisaremos en cuanto esté aprobado.
        </p>
      </div>
    )
  }

  if (status === 'suspended' || status === 'closed') {
    return (
      <div className="mt-4 flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
        <Ban className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-red-700 dark:text-red-300">
          <p>
            <span className="font-semibold">{status === 'suspended' ? 'Cuenta suspendida.' : 'Comercio cerrado.'}</span>{' '}
            No puedes publicar packs. Contacta con soporte para resolverlo.
          </p>
          {statusReason && <p className="mt-1 opacity-80">Motivo: {statusReason}</p>}
        </div>
      </div>
    )
  }

  // A partir de aquí: draft o rejected. Ambos permiten enviar a revisión.
  const isRejected = status === 'rejected'
  const isIncomplete = missingFields.length > 0
  // Los términos pendientes también bloquean: la RPC los exige (0040) y el
  // checkbox de abajo es la forma de cumplirlos sin salir de la pantalla.
  const termsPending = termsRequired && !termsChecked
  // Los cambios sin guardar YA NO bloquean: el boton guarda y envia de una.
  // Solo la falta de datos obligatorios (o de aceptación) impide llamar.
  const blocked = isIncomplete || termsPending
  const accent = isRejected ? 'red' : 'blue'

  // El boton dice por que no se puede pulsar. Antes ponia siempre "Enviar a
  // revision" y el motivo real estaba al final del aviso, lejos de la vista:
  // el comercio miraba el boton gris y no entendia que le faltaba.
  const label = isIncomplete
    ? `Faltan ${missingFields.length} ${missingFields.length === 1 ? 'campo' : 'campos'}`
    : termsPending
      ? 'Acepta los términos'
      : hasUnsavedChanges
        ? 'Guardar y enviar'
        : isRejected
          ? 'Volver a enviar'
          : 'Enviar a revision'

  return (
    <div
      className={`mt-4 rounded-xl px-4 py-3 border ${
        isRejected ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          {isRejected ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <Send className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          )}
          <div
            className={`text-xs ${isRejected ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}
          >
            {isRejected ? (
              <>
                <p>
                  <span className="font-semibold">No se aprobó tu comercio.</span> Corrige lo indicado y vuelve a
                  enviarlo.
                </p>
                {statusReason && (
                  <p className="mt-1.5 px-2 py-1.5 rounded-lg bg-black/5 dark:bg-black/20 border border-red-500/10">
                    <span className="opacity-70">Motivo:</span> {statusReason}
                  </p>
                )}
              </>
            ) : (
              <p>
                <span className="font-semibold">Tu comercio aún no se ha enviado a revisión.</span> Envíalo para poder
                publicar packs y aparecer en el catálogo.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onSubmitForReview}
          disabled={blocked || submitting}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
            blocked || submitting
              ? 'bg-black/5 dark:bg-white/5 text-gray-500 cursor-not-allowed border border-black/10 dark:border-white/10'
              : accent === 'red'
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
          }`}
        >
          {submitting ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              Enviando...
            </>
          ) : (
            <>
              {isIncomplete ? <AlertTriangle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {label}
            </>
          )}
        </button>
      </div>

      {/* Motivo exacto por el que el botón está bloqueado. Nunca dejamos que el
          comercio pulse para que la base le responda con un error genérico. */}
      {isIncomplete && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
          <p className="text-[11px] text-gray-700 dark:text-gray-300 mb-1.5 font-medium">
            Toca cada dato para completarlo y poder enviar:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map((field) => (
              <button
                key={field.label}
                onClick={() => onGoToTab(field.tab)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-medium text-amber-700 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all"
              >
                {field.label}
                <span className="opacity-40">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aceptación de los Términos para Comercios. Solo aparece si hay un
          documento publicado que este dueño aún no aceptó. La aceptación real
          se registra al enviar (accept_legal_document); el checkbox captura
          la voluntad y habilita el botón. */}
      {!isIncomplete && termsRequired && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => onTermsCheckedChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-white/20 text-primary focus:ring-primary/50 cursor-pointer"
            />
            <span className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
              He leído y acepto los{' '}
              <a
                href="/legal/terminos-comercios"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-2"
              >
                Términos y Condiciones para Comercios
              </a>
              , incluida mi responsabilidad sobre la inocuidad de los alimentos y la vigencia de mis autorizaciones
              sanitarias.
            </span>
          </label>
        </div>
      )}

      {!isIncomplete && hasUnsavedChanges && (
        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
          <p className="text-[11px] text-gray-600 dark:text-gray-400">
            Tienes cambios sin guardar. Se guardarán automáticamente al enviar.
          </p>
        </div>
      )}
    </div>
  )
}

export default function BusinessProfileLayout({
  activeTab,
  onTabChange,
  children,
  shopName: _shopName,
  completionPercentage,
  onPreview,
  status,
  statusReason,
  missingFields,
  hasUnsavedChanges,
  onSubmitForReview,
  onGoToTab,
  submitting,
  shopExists,
  termsRequired,
  termsChecked,
  onTermsCheckedChange,
}: BusinessProfileLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-bold dark:text-white text-gray-900">Perfil del Comercio</h1>
                {status === 'verified' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-semibold text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Verificado
                  </span>
                )}
              </div>
              <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                Gestiona la informacion publica de tu negocio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 dark:bg-black/40 bg-white dark:border-white/10 border-gray-200 rounded-xl px-4 py-2">
              <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
              </div>
              <div>
                <p className="text-[10px] dark:text-gray-500 text-gray-500">Perfil completado</p>
                <div className="w-20 h-1.5 dark:bg-white/10 bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={onPreview}
              className="flex items-center gap-2 dark:bg-black/40 bg-white dark:border-white/10 border-gray-200 rounded-xl px-4 py-2 text-sm dark:text-gray-400 text-gray-700 dark:hover:text-white hover:text-gray-900 dark:hover:border-primary/30 hover:border-primary/30 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Vista previa</span>
            </button>
          </div>
        </div>

        <StatusNotice
          status={status}
          statusReason={statusReason}
          missingFields={missingFields}
          hasUnsavedChanges={hasUnsavedChanges}
          onSubmitForReview={onSubmitForReview}
          onGoToTab={onGoToTab}
          submitting={submitting}
          shopExists={shopExists}
          termsRequired={termsRequired}
          termsChecked={termsChecked}
          onTermsCheckedChange={onTermsCheckedChange}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 dark:bg-black/40 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {profileTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                isActive
                  ? 'dark:bg-black/60 bg-white dark:text-white text-gray-900 shadow-lg dark:border-white/10 border-gray-200 border'
                  : 'dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="animate">
        {children}
      </motion.div>
    </div>
  )
}
