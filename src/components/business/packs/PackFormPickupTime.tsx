'use client'

import { Calendar } from 'lucide-react'
import Input from '@/components/ui/Input'

interface PickupData {
  pickup_date: string
  pickup_start_time: string
  pickup_end_time: string
}

interface Props {
  data: PickupData
  onChange: (data: PickupData) => void
}

const todayPresets = [
  { label: 'Hoy', days: 0 },
  { label: 'Manana', days: 1 },
  { label: 'Pasado manana', days: 2 },
]

const startTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00']
const endTimes = ['10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00']

export default function PackFormPickupTime({ data, onChange }: Props) {
  const update = (partial: Partial<PickupData>) => onChange({ ...data, ...partial })

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Recogida
        </h2>
        <span className="text-xs text-gray-500">Opcional</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {todayPresets.map(opt => {
          const d = new Date(Date.now() + opt.days * 86400000)
          const dateStr = d.toISOString().split('T')[0]
          return (
            <button key={opt.label} type="button" onClick={() => update({ pickup_date: dateStr })}
              className={`px-4 py-2 rounded-full text-sm ${data.pickup_date === dateStr ? 'bg-primary text-black font-medium' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {opt.label} ({d.toLocaleDateString('es-ES', { weekday: 'short' })})
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <Input label="Fecha" type="date" value={data.pickup_date}
          onChange={(e) => update({ pickup_date: e.target.value })} icon={<Calendar className="w-4 h-4" />} />

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Desde</label>
          <div className="flex gap-2 flex-wrap">
            {startTimes.map(t => (
              <button key={t} type="button" onClick={() => update({ pickup_start_time: t })}
                className={`px-3 py-1.5 rounded-lg text-xs ${data.pickup_start_time === t ? 'bg-primary text-black font-medium' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
            ))}
            <Input type="time" value={data.pickup_start_time} onChange={(e) => update({ pickup_start_time: e.target.value })} className="w-28" placeholder="Hora" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Hasta</label>
          <div className="flex gap-2 flex-wrap">
            {endTimes.map(t => (
              <button key={t} type="button" onClick={() => update({ pickup_end_time: t })}
                className={`px-3 py-1.5 rounded-lg text-xs ${data.pickup_end_time === t ? 'bg-primary text-black font-medium' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
            ))}
            <Input type="time" value={data.pickup_end_time} onChange={(e) => update({ pickup_end_time: e.target.value })} className="w-28" placeholder="Hora" />
          </div>
        </div>
      </div>
    </div>
  )
}
