'use client'

import { useRef, useState } from 'react'
import { Calendar, ChevronDown, Clock, AlertCircle, Pencil } from 'lucide-react'
import Input from '@/components/ui/Input'
import { chileDateIn, chileTimeNow } from '@/lib/utils/packForm'

interface PickupData {
  pickup_date: string
  pickup_start_time: string
  pickup_end_time: string
}

interface Props {
  data: PickupData
  onChange: (data: PickupData) => void
}

/*
 * REDISENO DE ESTA SECCION
 *
 * Antes: un badge "Opcional", 8 botones de hora de inicio, 8 de fin y dos
 * campos de hora sueltos. 16 botones para decir "de 18 a 20", y nada explicaba
 * que esa ventana es el rato en que el cliente pasa a recoger.
 *
 * Ahora: dia -> franja -> (opcional) ajuste fino. Las franjas son las que un
 * comercio usa de verdad, y se elige la ventana entera de un toque en vez de
 * componerla con dos listas. El texto en lenguaje natural ("Podran recoger el
 * viernes, entre las 18:00 y las 20:00") sirve de confirmacion antes de guardar.
 *
 * La recogida NO es opcional: es la ventana que valida la reserva. Sin ella el
 * pack nace caducado y no aparece en el catalogo.
 */

const DAY_PRESETS = [
  { label: 'Hoy', days: 0 },
  { label: 'Mañana', days: 1 },
  { label: 'Pasado', days: 2 },
]

const SLOTS = [
  { id: 'morning', label: 'Mañana', hint: '09:00 – 12:00', start: '09:00', end: '12:00' },
  { id: 'midday', label: 'Mediodía', hint: '12:00 – 15:00', start: '12:00', end: '15:00' },
  { id: 'afternoon', label: 'Tarde', hint: '15:00 – 18:00', start: '15:00', end: '18:00' },
  { id: 'evening', label: 'Cierre', hint: '18:00 – 21:00', start: '18:00', end: '21:00' },
]

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 'Otro día'
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDay(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  if (dateStr === chileDateIn(0)) return 'hoy'
  if (dateStr === chileDateIn(1)) return 'mañana'
  return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function PackFormPickupTime({ data, onChange }: Props) {
  const update = (partial: Partial<PickupData>) => onChange({ ...data, ...partial })

  const activeSlot = SLOTS.find((s) => s.start === data.pickup_start_time && s.end === data.pickup_end_time)

  // El ajuste manual se abre solo si las horas guardadas no son una franja.
  const [showCustom, setShowCustom] = useState(() => !!(data.pickup_start_time || data.pickup_end_time) && !activeSlot)

  const isToday = data.pickup_date === chileDateIn(0)
  const complete = !!(data.pickup_date && data.pickup_start_time && data.pickup_end_time)

  // Una fecha elegida a mano: no coincide con ninguno de los tres atajos.
  const isCustomDate = !!data.pickup_date && !DAY_PRESETS.some((p) => chileDateIn(p.days) === data.pickup_date)

  const dateInputRef = useRef<HTMLInputElement>(null)

  /*
   * showPicker() es lo que abre el calendario nativo. No existe en todos los
   * navegadores y lanza si el input no es visible, de ahi el try: si falla,
   * queda el comportamiento normal del campo y el comercio puede teclear.
   */
  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker()
    } catch {
      /* navegador sin soporte: se usa el input tal cual */
    }
  }

  /*
   * Avisos en el momento, sin esperar a que el formulario se envie: son los
   * dos motivos por los que la base de datos rechaza la ventana con
   * INVALID_PICKUP_WINDOW.
   */
  const endBeforeStart =
    !!data.pickup_start_time && !!data.pickup_end_time && data.pickup_start_time >= data.pickup_end_time

  const alreadyPast = isToday && !!data.pickup_start_time && data.pickup_start_time <= chileTimeNow()

  return (
    <div className="dark:bg-black/40 bg-white dark:backdrop-blur-sm backdrop-blur-sm rounded-2xl p-6 border dark:border-white/10 border-gray-200">
      <div className="flex items-start gap-3 mb-1">
        <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="text-lg font-semibold dark:text-white text-gray-900">¿Cuándo se recoge?</h2>
          <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
            Es la franja en la que el cliente pasa por tu local a retirar el pack.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <span className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Día</span>
        <div className="flex flex-wrap gap-2">
          {DAY_PRESETS.map((opt) => {
            const dateStr = chileDateIn(opt.days)
            const selected = data.pickup_date === dateStr
            const weekday = new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short' })
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ pickup_date: dateStr })}
                className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
                  selected
                    ? 'bg-primary text-black font-semibold'
                    : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200'
                }`}
              >
                {opt.label} <span className="opacity-60">({weekday})</span>
              </button>
            )
          })}

          {/*
           * El <input type="date"> nativo ya trae calendario, pero en Chrome
           * solo se despliega al pulsar su icono diminuto: si el comercio hace
           * clic en el resto del campo, se queda tecleando la fecha a mano.
           * Aqui el input cubre todo el boton en transparente y el clic llama a
           * showPicker(), asi que el calendario se abre pulsando donde sea.
           */}
          <div
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
              isCustomDate
                ? 'bg-primary text-black font-semibold'
                : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{isCustomDate ? formatShortDate(data.pickup_date) : 'Otro día'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <input
              ref={dateInputRef}
              type="date"
              aria-label="Elegir otra fecha de recogida"
              min={chileDateIn(0)}
              value={data.pickup_date}
              onChange={(e) => update({ pickup_date: e.target.value })}
              onClick={openDatePicker}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <span className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Franja horaria</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SLOTS.map((slot) => {
            const selected = activeSlot?.id === slot.id
            const past = isToday && slot.start <= chileTimeNow()
            return (
              <button
                key={slot.id}
                type="button"
                aria-pressed={selected}
                disabled={past}
                onClick={() => {
                  update({ pickup_start_time: slot.start, pickup_end_time: slot.end })
                  setShowCustom(false)
                }}
                className={`px-3 py-3 rounded-xl text-left transition-all border ${
                  selected
                    ? 'bg-primary text-black font-semibold border-primary'
                    : past
                      ? 'dark:bg-white/5 bg-gray-100 dark:text-gray-600 text-gray-400 border-transparent cursor-not-allowed opacity-50'
                      : 'dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 border-transparent dark:hover:bg-white/10 hover:bg-gray-200'
                }`}
              >
                <span className="block text-sm">{slot.label}</span>
                <span className={`block text-xs mt-0.5 ${selected ? 'opacity-70' : 'opacity-60'}`}>{slot.hint}</span>
              </button>
            )
          })}
        </div>

        {!showCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Pencil className="w-3.5 h-3.5" />
            Usar otro horario
          </button>
        )}

        {showCustom && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-white/10 border-gray-200">
            <Input
              label="Desde"
              type="time"
              value={data.pickup_start_time}
              onChange={(e) => update({ pickup_start_time: e.target.value })}
            />
            <Input
              label="Hasta"
              type="time"
              value={data.pickup_end_time}
              onChange={(e) => update({ pickup_end_time: e.target.value })}
            />
          </div>
        )}
      </div>

      {endBeforeStart && (
        <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          La hora de fin debe ser posterior a la de inicio.
        </p>
      )}

      {!endBeforeStart && alreadyPast && (
        <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Esa hora ya pasó. Elige una franja más tarde o cambia el día.
        </p>
      )}

      {complete && !endBeforeStart && !alreadyPast && (
        <p className="mt-4 rounded-xl dark:bg-primary/10 bg-primary/10 border border-primary/20 px-4 py-3 text-sm dark:text-gray-200 text-gray-800">
          Podrán recoger <span className="font-semibold">{formatDay(data.pickup_date)}</span>, entre las{' '}
          <span className="font-semibold">{data.pickup_start_time}</span> y las{' '}
          <span className="font-semibold">{data.pickup_end_time}</span>.
        </p>
      )}
    </div>
  )
}
