import {
  ArrowRight, Package, CreditCard, Clock,
  CheckCircle, XCircle, AlertTriangle, QrCode, Star,
  RotateCcw, Leaf, Zap, Users, Store,
  ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { useState } from 'react'

interface Step {
  id: number
  title: string
  description: string
  icon: React.ElementType
  actor: 'usuario' | 'comercio' | 'sistema'
  color: string
  bgColor: string
  details: string[]
}

const flowSteps: Step[] = [
  {
    id: 1,
    title: 'Comercio publica pack',
    description: 'El comercio crea un pack con excedentes del día, define precio, cantidad y ventana de recogida.',
    icon: Store,
    actor: 'comercio',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    details: [
      'Define: título, descripción, items incluidos',
      'Precio pack (ej: $2.50) vs precio original ($8.00)',
      'Cantidad disponible (ej: 5 packs)',
      'Ventana de recogida (ej: 19:00 - 20:00)',
      'El pack aparece en el feed de usuarios cercanos',
    ],
  },
  {
    id: 2,
    title: 'Usuario descubre y reserva',
    description: 'El usuario ve el pack en su feed, revisa detalles y toca "Reservar".',
    icon: Users,
    actor: 'usuario',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    details: [
      'El pack muestra: descuento %, distancia, rating',
      'Usuario ve items incluidos y hora de recogida',
      'Toca "Reservar" → se crea reserva en estado "pending"',
      'Se aparta 1 pack (available--)',
      'Tiene 5 minutos para completar el pago',
    ],
  },
  {
    id: 3,
    title: 'Usuario paga',
    description: 'El usuario completa el pago en la app. La reserva pasa a "confirmed".',
    icon: CreditCard,
    actor: 'usuario',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    details: [
      'Pago con tarjeta, PayPal o saldo en app',
      'Se genera código único: PAP-AB12',
      'Se genera QR con el código de recogida',
      'Reserva → estado "confirmed"',
      'El comercio recibe notificación: "Nuevo pack reservado"',
    ],
  },
  {
    id: 4,
    title: 'Esperar ventana de recogida',
    description: 'El usuario espera hasta la hora indicada. ANTES de la ventana puede cancelar con reembolso.',
    icon: Clock,
    actor: 'sistema',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    details: [
      'ANTES de pickupStart: puede cancelar → reembolso 100%',
      'El pack vuelve a disponible si se cancela',
      'DENTRO de los 30 min antes: NO puede cancelar',
      'La app envía push notification: "¡Tu pack está listo!"',
      'Al llegar la hora → reserva pasa a "ready_pickup"',
    ],
  },
  {
    id: 5,
    title: 'Usuario va a recoger',
    description: 'DURANTE la ventana horaria, el usuario va al comercio y muestra su QR/código.',
    icon: QrCode,
    actor: 'usuario',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    details: [
      'La app muestra QR + código PAP-AB12',
      'Usuario llega al comercio dentro de la ventana',
      'Muestra el QR al comerciante',
      'El comercio escanea el QR o ingresa el código',
      'La app valida: código correcto + dentro de ventana',
    ],
  },
  {
    id: 6,
    title: 'Comercio valida recogida',
    description: 'El comercio escanea el QR y confirma la entrega. Reserva → "picked_up".',
    icon: CheckCircle,
    actor: 'comercio',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    details: [
      'Comercio escanea QR con su app',
      'Sistema verifica: código válido + estado "ready_pickup"',
      'Comercio confirma items entregados',
      'Reserva → estado "picked_up"',
      'Se libera de "reserved" (ya fue entregado)',
      'Usuario recibe confirmación: "¡Pack recogido!"',
    ],
  },
  {
    id: 7,
    title: 'Calificación y puntos',
    description: 'Usuario califica al comercio. Se suman puntos de gamificación y se registra el impacto ambiental.',
    icon: Star,
    actor: 'usuario',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    details: [
      'Usuario califica 1-5 estrellas al comercio',
      'Se suman puntos de gamificación (+10 por pack)',
      'Se registra CO₂ evitado (~1.2kg por pack)',
      'El comercio puede calificar puntualidad del usuario',
      'El pack completado aparece en historial',
    ],
  },
]

// Escenarios alternativos
const alternateScenarios = [
  {
    title: '🚫 Pack se agota (sold out)',
    description: 'Cuando available llega a 0, el pack DESAPARECE del feed automáticamente.',
    icon: Package,
    color: 'text-red-400',
    details: [
      'Cada reserva confirmada resta 1 de available',
      'Cuando available === 0 → pack.status = "sold_out"',
      'El pack DESAPARECE del feed de búsqueda',
      'Los usuarios que ya reservaron mantienen su reserva',
      'Si alguien cancela → available++ → el pack REAPARECE',
    ],
  },
  {
    title: '⏰ Usuario NO recoge a tiempo',
    description: 'Si pasa la ventana horaria sin recoger, la reserva expira y pierde el dinero.',
    icon: AlertTriangle,
    color: 'text-orange-400',
    details: [
      'Después de pickupEnd → sistema marca como "expired"',
      'El usuario PIERDE el dinero (no hay reembolso)',
      'El pack NO vuelve a disponible (se desperdició)',
      'Se notifica al usuario: "Tu reserva expiró"',
      'Se resta 1 punto de reputación del usuario',
      'El comercio puede donar el pack no recogido',
    ],
  },
  {
    title: '🔄 Usuario cancela antes',
    description: 'Si cancela 30+ min antes de la ventana, recibe reembolso completo.',
    icon: RotateCcw,
    color: 'text-blue-400',
    details: [
      'Cancelación permitida hasta 30 min antes de pickupStart',
      'Reembolso 100% al método de pago original',
      'El pack vuelve a disponible (available++)',
      'El pack REAPARECE en el feed si estaba sold_out',
      'Dentro de los 30 min: NO se permite cancelar',
      'Durante la ventana: NO se puede cancelar',
    ],
  },
  {
    title: '⚡ Código de recogida inválido',
    description: 'Si el código no existe o ya fue usado, el comercio recibe un error.',
    icon: XCircle,
    color: 'text-red-400',
    details: [
      'Código no existe → "Código inválido"',
      'Código ya usado → "Este pack ya fue recogido"',
      'Fuera de ventana → "Fuera de horario de recogida"',
      'Reserva cancelada → "Esta reserva fue cancelada"',
      'El comercio puede contactar soporte si hay problemas',
    ],
  },
]

export default function FlowDiagram() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Documentación del flujo</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-black text-white">
          Flujo completo de <span className="text-gradient">Reserva</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Del comercio al usuario y de vuelta. Cada paso, cada estado, cada regla de negocio explicada.
        </p>
      </div>

      {/* Flow legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-gray-400">Usuario</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-gray-400">Comercio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-400">Sistema</span>
        </div>
      </div>

      {/* Main flow steps */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-dark-border hidden lg:block" />

        <div className="space-y-3">
          {flowSteps.map((step, i) => {
            const isExpanded = expandedStep === step.id
            return (
              <div key={step.id} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                {/* Step card */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  className={`w-full flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left ${
                    isExpanded
                      ? `${step.bgColor} border-primary/20 shadow-lg shadow-primary/5`
                      : 'bg-dark-card border-dark-border hover:border-dark-hover'
                  }`}
                >
                  {/* Number + Icon */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl ${step.bgColor} flex items-center justify-center`}>
                      <step.icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {step.id}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${isExpanded ? 'text-white' : 'text-gray-300'}`}>
                        {step.title}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        step.actor === 'usuario' ? 'bg-primary/10 text-primary' :
                        step.actor === 'comercio' ? 'bg-violet-500/10 text-violet-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {step.actor}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-2 ml-16 bg-dark-card border border-dark-border rounded-xl p-4 animate-fade-in-up">
                    <div className="space-y-2">
                      {step.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-400">{detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arrow between steps */}
                {i < flowSteps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-dark-border" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* State diagram */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Diagrama de estados de la Reserva
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg font-medium">pending</span>
          <span className="text-gray-600">→</span>
          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-medium">confirmed</span>
          <span className="text-gray-600">→</span>
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium">ready_pickup</span>
          <span className="text-gray-600">→</span>
          <span className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg font-bold">picked_up ✓</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-medium">confirmed</span>
          <span className="text-gray-600">→</span>
          <span className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg font-medium">cancelled</span>
          <span className="text-gray-600">→</span>
          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-medium">refunded</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium">ready_pickup</span>
          <span className="text-gray-600">→</span>
          <span className="bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-lg font-bold">expired ✗</span>
          <span className="text-gray-500 text-xs ml-2">(no recogió a tiempo)</span>
        </div>
      </div>

      {/* Pack state diagram */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Diagrama de estados del Pack
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg font-medium">available</span>
          <span className="text-gray-600">→</span>
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium">selling</span>
          <span className="text-gray-600">(reservas entrando)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium">selling</span>
          <span className="text-gray-600">→</span>
          <span className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg font-bold">sold_out</span>
          <span className="text-gray-500 text-xs">(available=0 → desaparece del feed)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg font-medium">sold_out</span>
          <span className="text-gray-600">→</span>
          <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg font-medium">pickup_window</span>
          <span className="text-gray-600">→</span>
          <span className="bg-gray-500/10 text-gray-400 px-3 py-1.5 rounded-lg font-medium">expired</span>
        </div>
        <div className="bg-dark-muted rounded-xl p-3">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            <span><strong>Nota:</strong> Si un usuario cancela, available++ y el pack puede REAPARECER en el feed si estaba sold_out.</span>
          </p>
        </div>
      </div>

      {/* Alternate scenarios */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Escenarios alternativos</h2>
        {alternateScenarios.map((scenario, i) => {
          const isExpanded = expandedScenario === i
          return (
            <div key={i} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedScenario(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <scenario.icon className={`w-5 h-5 ${scenario.color} flex-shrink-0`} />
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm">{scenario.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{scenario.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {isExpanded && (
                <div className="px-5 pb-5 space-y-2 animate-fade-in-up">
                  {scenario.details.map((detail, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />
                      <p className="text-sm text-gray-400">{detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Database schema suggestion */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Schema de Supabase sugerido
        </h2>
        <div className="bg-dark-muted rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-gray-400 leading-relaxed font-mono">{`-- TABLA: packs
CREATE TABLE packs (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  title TEXT NOT NULL,
  description TEXT,
  items JSONB,              -- ['3 Golfeados', '2 Cachitos']
  price DECIMAL NOT NULL,
  original_price DECIMAL,
  total_available INT,      -- Cantidad inicial
  available INT,            -- Disponibles ahora
  reserved INT DEFAULT 0,   -- Reservados
  pickup_start TIME,        -- '19:00'
  pickup_end TIME,          -- '20:00'
  pickup_date DATE,         -- '2025-01-15'
  status TEXT DEFAULT 'available',
    -- available | selling | sold_out | pickup_window | expired
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLA: reservations
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  pack_id UUID REFERENCES packs(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
    -- pending | confirmed | ready_pickup | picked_up
    -- | expired | cancelled | refunded
  pickup_code TEXT UNIQUE,  -- 'PAP-AB12'
  qr_data TEXT,             -- 'paporla://pickup/PAP-AB12'
  price DECIMAL,
  reserved_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  user_rating INT,          -- 1-5
  shop_rating INT           -- 1-5
);

-- TRIGGER: Actualizar disponibilidad al reservar
CREATE FUNCTION update_pack_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    UPDATE packs SET
      available = available - 1,
      reserved = reserved + 1,
      status = CASE
        WHEN available - 1 = 0 THEN 'sold_out'
        ELSE 'selling'
      END
    WHERE id = NEW.pack_id;
  END IF;

  IF NEW.status = 'cancelled' THEN
    UPDATE packs SET
      available = available + 1,
      reserved = reserved - 1,
      status = CASE
        WHEN available + 1 > 0 THEN 'selling'
        ELSE status
      END
    WHERE id = NEW.pack_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reservation_status_change
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_pack_availability();`}</pre>
        </div>
      </div>
    </div>
  )
}
