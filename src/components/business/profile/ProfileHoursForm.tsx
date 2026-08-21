'use client'

import { Clock, AlertCircle } from 'lucide-react'
import { DAY_LABELS } from '@/lib/constants/hours'
import { validateHours, type DayHours, type HoursData } from '@/lib/utils/shopHours'

interface ProfileHoursFormProps {
  hours: HoursData
  onHoursChange: (hours: HoursData) => void
}

/** Aplica los mismos valores a todos los días indicados. */
function buildWeek(fn: (day: string) => DayHours): HoursData {
  const next: HoursData = {}
  for (const day of DAY_LABELS) next[day] = fn(day)
  return next
}

const PRESETS: { label: string; build: () => HoursData }[] = [
  {
    label: 'Lun-Vie 8-20',
    build: () =>
      buildWeek((day) => {
        const isWeekend = day === 'Sábado' || day === 'Domingo'
        return {
          open: isWeekend ? '09:00' : '08:00',
          close: isWeekend ? '18:00' : '20:00',
          closed: isWeekend,
        }
      }),
  },
  {
    label: 'Todos los días 8-20',
    build: () => buildWeek(() => ({ open: '08:00', close: '20:00', closed: false })),
  },
  {
    // No se puede usar 00:00-00:00: el CHECK exige closes_at > opens_at estricto.
    label: '24 horas',
    build: () => buildWeek(() => ({ open: '00:00', close: '23:59', closed: false })),
  },
]

export default function ProfileHoursForm({ hours, onHoursChange }: ProfileHoursFormProps) {
  const updateHours = (day: string, field: keyof DayHours, value: string | boolean) => {
    onHoursChange({
      ...hours,
      [day]: { ...hours[day], [field]: value } as DayHours,
    })
  }

  // Validación en vivo: evita que el usuario descubra el error solo al guardar.
  const errors = validateHours(hours)

  return (
    <div className="dark:bg-black/40 bg-white dark:backdrop-blur-sm backdrop-blur-sm border dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-6">
      <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Horarios de atención
      </h2>
      <p className="text-sm dark:text-gray-400 text-gray-600">Define cuándo los usuarios pueden recoger sus packs.</p>

      <div className="space-y-3">
        {DAY_LABELS.map((day) => {
          const entry = hours[day]
          const closed = !!entry?.closed
          const invalid = !closed && !!entry?.open && !!entry?.close && entry.close <= entry.open

          return (
            <div
              key={day}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                closed ? 'dark:bg-black/30 bg-gray-50' : 'dark:bg-black/40 bg-white'
              } ${invalid ? 'ring-1 ring-red-500/50' : ''}`}
            >
              <div className="w-24 flex-shrink-0">
                <p
                  className={`text-sm font-medium ${closed ? 'dark:text-gray-600 text-gray-400' : 'dark:text-white text-gray-900'}`}
                >
                  {day}
                </p>
              </div>

              {closed ? (
                <div className="flex-1">
                  <p className="text-sm dark:text-gray-600 text-gray-400">Cerrado</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="time"
                    aria-label={`Hora de apertura del ${day}`}
                    value={entry?.open ?? '09:00'}
                    onChange={(e) => updateHours(day, 'open', e.target.value)}
                    className="dark:bg-black/60 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-lg px-3 py-2 text-sm dark:text-white text-gray-900 focus:border-primary focus:outline-none"
                  />
                  <span className="dark:text-gray-600 text-gray-400 text-sm">a</span>
                  <input
                    type="time"
                    aria-label={`Hora de cierre del ${day}`}
                    value={entry?.close ?? '18:00'}
                    onChange={(e) => updateHours(day, 'close', e.target.value)}
                    className="dark:bg-black/60 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-lg px-3 py-2 text-sm dark:text-white text-gray-900 focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => updateHours(day, 'closed', !closed)}
                aria-pressed={closed}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  closed
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'dark:text-gray-500 text-gray-400 dark:bg-black/60 bg-gray-100 dark:hover:bg-black/80 hover:bg-gray-200'
                }`}
              >
                {closed ? 'Abrir' : 'Cerrar'}
              </button>
            </div>
          )
        })}
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-1">
          <p className="text-sm font-medium text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Corrige estos horarios antes de guardar
          </p>
          <ul className="text-xs text-red-300 list-disc list-inside space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-xs dark:text-gray-500 text-gray-400 mr-2 self-center">Presets:</span>
        {PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => onHoursChange(preset.build())}
            className="text-xs dark:text-gray-400 text-gray-600 dark:bg-black/40 bg-gray-50 border dark:border-white/10 border-gray-200 dark:hover:border-primary/30 hover:border-primary/30 dark:hover:text-primary hover:text-primary px-3 py-1.5 rounded-lg transition-all"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
