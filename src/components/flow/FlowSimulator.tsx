import { useState } from 'react'
import type { SimulationPack, SimulationReservation, ReservationStatus } from '../../types/reservationFlow'
import {
  Users, Store, CheckCircle, XCircle, Clock, CreditCard,
  RotateCcw, QrCode, Star, AlertTriangle,
  Package, Zap, Trash2, Leaf, ChevronRight
} from 'lucide-react'
import { useReservationStore } from '../../store/reservationStore'

const statusColors: Record<ReservationStatus, { text: string; bg: string; border: string }> = {
  pending: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  confirmed: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ready_pickup: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  picked_up: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  expired: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  cancelled: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  refunded: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
}

const statusLabels: Record<ReservationStatus, string> = {
  pending: '⏳ Pendiente',
  confirmed: '💰 Confirmada',
  ready_pickup: '📦 Lista para recoger',
  picked_up: '✅ Recogida',
  expired: '⛔ Expirada',
  cancelled: '🔄 Cancelada',
  refunded: '💸 Reembolsada',
}

const packStatusLabels: Record<string, string> = {
  available: '🟢 Disponible',
  selling: '🔵 Vendiendo',
  sold_out: '🔴 Agotado',
  pickup_window: '🟡 En recogida',
  expired: '⚫ Expirado',
}

export default function FlowSimulator() {
  const {
    packs, reservations, logs,
    reservePack, confirmPayment, activatePickupWindow,
    validatePickup, expireReservation, cancelReservation, rateReservation,
  } = useReservationStore()

  const [pickupCode, setPickupCode] = useState('')
  const [validationResult, setValidationResult] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'packs' | 'reservations' | 'logs'>('packs')

  const handleReserve = () => {
    const res = reservePack('pack-1', 'user-1', 'María G.')
    if (res) {
      setActiveView('reservations')
    }
  }

  const handleReserveSushi = () => {
    const res = reservePack('pack-2', 'user-2', 'Carlos R.')
    if (res) {
      setActiveView('reservations')
    }
  }

  const handleValidatePickup = () => {
    if (!pickupCode.trim()) return
    const res = validatePickup(pickupCode.trim().toUpperCase())
    if (res) {
      setValidationResult(`✅ ¡Recogida validada! ${res.userName} recogió "${res.packTitle}"`)
    } else {
      setValidationResult(`❌ Código inválido o no listo para recogida`)
    }
    setPickupCode('')
    setTimeout(() => setValidationResult(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Simulador interactivo</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-black text-white">
          Simula el <span className="text-gradient">flujo completo</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Haz clic en los botones para simular cada paso del flujo y ver cómo cambian los estados en tiempo real.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-dark-muted rounded-xl p-1">
        {[
          { id: 'packs' as const, label: 'Packs', icon: Package },
          { id: 'reservations' as const, label: 'Reservas', icon: Clock },
          { id: 'logs' as const, label: 'Logs', icon: Leaf },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeView === tab.id
                ? 'bg-dark-card text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'reservations' && reservations.length > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reservations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* PACKS VIEW */}
      {activeView === 'packs' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packs.map((pack: SimulationPack) => (
              <div key={pack.id} className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-muted flex items-center justify-center text-2xl">
                    {pack.shopEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{pack.title}</h3>
                    <p className="text-xs text-gray-500">{pack.shopName}</p>
                  </div>
                </div>

                {/* Availability bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Disponibilidad</span>
                    <span className="text-white font-bold">{pack.available}/{pack.totalAvailable}</span>
                  </div>
                  <div className="h-2 bg-dark-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pack.available === 0 ? 'bg-red-500' :
                        pack.available <= 1 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${(pack.available / pack.totalAvailable) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-600">
                    <span>Reservados: {pack.reserved}</span>
                    <span>{packStatusLabels[pack.status]}</span>
                  </div>
                </div>

                {/* Price + Time */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-lg font-black text-primary">${pack.price.toFixed(2)}</span>
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pack.pickupStart}-{pack.pickupEnd}
                  </span>
                </div>

                {/* Actions */}
                {pack.id === 'pack-1' && pack.available > 0 && (
                  <button
                    onClick={handleReserve}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Reservar (María G.)
                  </button>
                )}
                {pack.id === 'pack-2' && pack.available > 0 && (
                  <button
                    onClick={handleReserveSushi}
                    className="w-full flex items-center justify-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    <Users className="w-4 h-4" />
                    Reservar (Carlos R.)
                  </button>
                )}
                {pack.available === 0 && (
                  <div className="w-full text-center text-xs text-red-400 bg-red-500/10 py-2.5 rounded-xl font-bold">
                    🔴 SOLD OUT — No disponible
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sold out explanation */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-red-400">¿Qué pasa cuando un pack se agota?</p>
              <p className="text-xs text-gray-400">
                Cuando <code className="text-red-300">available === 0</code>, el pack pasa a <code className="text-red-300">sold_out</code> y <strong>desaparece automáticamente del feed</strong>. 
                Los usuarios que ya reservaron mantienen su reserva. Si alguien cancela, el pack <strong>reaparece</strong> en el feed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RESERVATIONS VIEW */}
      {activeView === 'reservations' && (
        <div className="space-y-4 animate-fade-in-up">
          {reservations.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Clock className="w-12 h-12 text-gray-700 mx-auto" />
              <p className="text-sm text-gray-500">No hay reservas aún</p>
              <p className="text-xs text-gray-600">Ve a la pestaña "Packs" y reserva uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res: SimulationReservation) => {
                const colors = statusColors[res.status]
                return (
                  <div key={res.id} className={`bg-dark-card border ${colors.border} rounded-2xl p-5 space-y-4`}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-dark-muted flex items-center justify-center text-xl">
                          {res.shopEmoji}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{res.packTitle}</h3>
                          <p className="text-xs text-gray-500">{res.shopName} · {res.userName}</p>
                        </div>
                      </div>
                      <span className={`${colors.bg} ${colors.text} text-xs font-bold px-3 py-1.5 rounded-lg`}>
                        {statusLabels[res.status]}
                      </span>
                    </div>

                    {/* Code + Price */}
                    <div className="flex items-center justify-between bg-dark-muted rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm font-bold text-white">{res.pickupCode}</span>
                      </div>
                      <span className="text-lg font-black text-primary">${res.price.toFixed(2)}</span>
                    </div>

                    {/* Actions based on status */}
                    <div className="flex flex-wrap gap-2">
                      {res.status === 'pending' && (
                        <button
                          onClick={() => confirmPayment(res.id)}
                          className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Confirmar pago
                        </button>
                      )}

                      {res.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => activatePickupWindow(res.id)}
                            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-4 py-2 rounded-xl transition-all"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Simular: llega hora de recogida
                          </button>
                          <button
                            onClick={() => cancelReservation(res.id)}
                            className="flex items-center gap-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Cancelar (reembolso)
                          </button>
                        </>
                      )}

                      {res.status === 'ready_pickup' && (
                        <>
                          <button
                            onClick={() => expireReservation(res.id)}
                            className="flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Simular: NO recogió (expira)
                          </button>
                        </>
                      )}

                      {res.status === 'picked_up' && !res.userRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Calificar:</span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => rateReservation(res.id, star)}
                              className="text-amber-400 hover:scale-125 transition-transform"
                            >
                              <Star className="w-5 h-5" />
                            </button>
                          ))}
                        </div>
                      )}

                      {res.status === 'picked_up' && res.userRating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: res.userRating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">({res.userRating}/5)</span>
                        </div>
                      )}

                      {res.status === 'expired' && (
                        <div className="text-xs text-orange-400 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                          Usuario perdió ${res.price.toFixed(2)} — pack no recuperable
                        </div>
                      )}

                      {res.status === 'cancelled' && (
                        <div className="text-xs text-blue-400 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reembolsado ${res.price.toFixed(2)} — pack volvió a disponible
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LOGS VIEW */}
      {activeView === 'logs' && (
        <div className="animate-fade-in-up">
          {logs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Leaf className="w-12 h-12 text-gray-700 mx-auto" />
              <p className="text-sm text-gray-500">No hay eventos registrados</p>
              <p className="text-xs text-gray-600">Interactúa con los packs para ver el log</p>
            </div>
          ) : (
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-border">
                <p className="text-sm font-bold text-white">Log de eventos</p>
              </div>
              <div className="divide-y divide-dark-border max-h-96 overflow-y-auto">
                {logs.map((log: string, i: number) => (
                  <div key={i} className="px-5 py-3 text-sm text-gray-400 font-mono hover:bg-white/[0.02] transition-colors">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commerce validation section */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-violet-400" />
          Vista del Comercio — Validar recogida
        </h2>
        <p className="text-sm text-gray-400">
          El comercio ingresa el código del usuario (o escanea su QR) para validar la entrega.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
            placeholder="PAP-XXXX"
            maxLength={8}
            className="flex-1 px-4 py-3 bg-dark-muted border border-dark-border rounded-xl text-center font-mono text-lg text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all tracking-widest"
          />
          <button
            onClick={handleValidatePickup}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light text-dark font-bold px-6 py-3 rounded-xl transition-all text-sm"
          >
            <CheckCircle className="w-5 h-5" />
            Validar
          </button>
        </div>

        {validationResult && (
          <div className={`p-4 rounded-xl text-sm font-medium animate-fade-in-up ${
            validationResult.startsWith('✅')
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {validationResult}
          </div>
        )}

        {/* Active pickup codes */}
        {reservations.filter((r: SimulationReservation) => r.status === 'ready_pickup').length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Códigos listos para recoger:</p>
            <div className="flex flex-wrap gap-2">
              {reservations.filter((r: SimulationReservation) => r.status === 'ready_pickup').map((r: SimulationReservation) => (
                <button
                  key={r.id}
                  onClick={() => setPickupCode(r.pickupCode)}
                  className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold px-3 py-2 rounded-lg hover:bg-primary/20 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {r.pickupCode}
                  <span className="text-[10px] text-primary/60">({r.userName})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rules summary */}
      <div className="bg-gradient-to-br from-primary/[0.04] to-violet-500/[0.04] border border-primary/20 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary" />
          Reglas de negocio resumidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: '📦 Disponibilidad',
              rules: [
                'Cada reserva resta available--',
                'available=0 → pack desaparece del feed',
                'Cancelación → available++ → pack reaparece',
                'Expiración → NO vuelve a disponible',
              ],
            },
            {
              title: '⏰ Ventana horaria',
              rules: [
                'Antes de ventana: puede cancelar',
                'Dentro de ventana: NO puede cancelar',
                'Solo se recoge DURANTE la ventana',
                'Después de ventana: expira sin reembolso',
              ],
            },
            {
              title: '🔐 Validación',
              rules: [
                'Código único: PAP-XXXX',
                'QR escaneable por el comercio',
                'Solo válido en estado ready_pickup',
                'Código usado = no reutilizable',
              ],
            },
            {
              title: '💰 Dinero',
              rules: [
                'Cancelación antes → reembolso 100%',
                'Expiración → pierde el dinero',
                'Recogida → pago al comercio (menos comisión)',
                'Comisión Paporla: 10% del precio del pack',
              ],
            },
          ].map((section, i) => (
            <div key={i} className="bg-dark-card/50 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-white">{section.title}</h3>
              {section.rules.map((rule, j) => (
                <div key={j} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400">{rule}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
