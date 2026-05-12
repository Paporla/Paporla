'use client';

import { Clock } from 'lucide-react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface HoursData {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface ProfileHoursFormProps {
  hours: HoursData;
  onHoursChange: (hours: HoursData) => void;
}

const presets = [
  { label: 'Lun-Vie 8-20', action: (currentHours: HoursData) => {
    const newHours = { ...currentHours };
    DAYS.forEach(day => {
      const isWeekend = day === 'Sábado' || day === 'Domingo';
      newHours[day] = {
        open: isWeekend ? '09:00' : '08:00',
        close: isWeekend ? '18:00' : '20:00',
        closed: isWeekend,
      };
    });
    return newHours;
  } },
  { label: 'Todos los días', action: (currentHours: HoursData) => {
    const newHours = { ...currentHours };
    DAYS.forEach(day => {
      newHours[day] = { open: '08:00', close: '20:00', closed: false };
    });
    return newHours;
  } },
  { label: '24 horas', action: (currentHours: HoursData) => {
    const newHours = { ...currentHours };
    DAYS.forEach(day => {
      newHours[day] = { open: '00:00', close: '23:59', closed: false };
    });
    return newHours;
  } },
];

export default function ProfileHoursForm({ hours, onHoursChange }: ProfileHoursFormProps) {
  const updateHours = (day: string, field: string, value: string | boolean) => {
    onHoursChange({
      ...hours,
      [day]: { ...hours[day], [field]: value },
    });
  };

  const applyPreset = (preset: typeof presets[0]) => {
    onHoursChange(preset.action(hours));
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 lg:p-8 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Horarios de atención
      </h2>
      <p className="text-sm text-gray-400">Define cuándo los usuarios pueden recoger sus packs.</p>

      <div className="space-y-3">
        {DAYS.map(day => (
          <div
            key={day}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              hours[day]?.closed ? 'bg-black/30' : 'bg-black/40'
            }`}
          >
            <div className="w-24 flex-shrink-0">
              <p className={`text-sm font-medium ${hours[day]?.closed ? 'text-gray-600' : 'text-white'}`}>
                {day}
              </p>
            </div>

            {hours[day]?.closed ? (
              <div className="flex-1">
                <p className="text-sm text-gray-600">Cerrado</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="time"
                  value={hours[day]?.open || '09:00'}
                  onChange={(e) => updateHours(day, 'open', e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
                <span className="text-gray-600 text-sm">a</span>
                <input
                  type="time"
                  value={hours[day]?.close || '18:00'}
                  onChange={(e) => updateHours(day, 'close', e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={() => updateHours(day, 'closed', !hours[day]?.closed)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                hours[day]?.closed
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-gray-500 bg-black/60 hover:bg-black/80'
              }`}
            >
              {hours[day]?.closed ? 'Abrir' : 'Cerrar'}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-xs text-gray-500 mr-2 self-center">Presets:</span>
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className="text-xs text-gray-400 bg-black/40 border border-white/10 hover:border-primary/30 hover:text-primary px-3 py-1.5 rounded-lg transition-all"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}