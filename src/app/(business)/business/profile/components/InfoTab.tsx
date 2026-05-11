'use client';

import { Building2, Store, Globe, MapPin, Phone, Link } from 'lucide-react';
import Input from '@/components/ui/Input';

const CATEGORIES = [
  { id: 'bakery', name: 'Panadería', emoji: '🥐' }, { id: 'restaurant', name: 'Restaurante', emoji: '🍽️' },
  { id: 'cafe', name: 'Cafetería', emoji: '☕' }, { id: 'pizzeria', name: 'Pizzería', emoji: '🍕' },
  { id: 'sushi', name: 'Sushi / Japonés', emoji: '🍣' }, { id: 'fruit', name: 'Frutería', emoji: '🥭' },
  { id: 'pastry', name: 'Pastelería', emoji: '🍰' }, { id: 'supermarket', name: 'Supermercado', emoji: '🛒' },
  { id: 'fastfood', name: 'Comida rápida', emoji: '🍔' }, { id: 'other', name: 'Otro', emoji: '🏪' },
];

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' }, { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', name: 'México', flag: '🇲🇽' }, { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' }, { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
];

interface InfoTabProps {
  formData: any;
  updateForm: (field: string, value: string) => void;
}

export default function InfoTab({ formData, updateForm }: InfoTabProps) {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 lg:p-8 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        Información del negocio
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Nombre del comercio" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Mi Restaurante" required />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 flex items-center gap-2"><Store className="w-4 h-4 text-primary" />Categoría</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => updateForm('category', cat.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${formData.category === cat.id ? 'bg-primary/10 border border-primary/30 text-white' : 'bg-black/40 border border-white/10 text-gray-400 hover:border-white/20'}`}>
                <span>{cat.emoji}</span><span className="text-xs">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Descripción</label>
        <textarea value={formData.description} onChange={(e) => updateForm('description', e.target.value)} rows={4} maxLength={300}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-all text-sm resize-none"
          placeholder="Describe tu negocio, especialidades, horarios de recogida de packs..." />
        <div className="flex justify-between"><p className="text-xs text-gray-500">Describe qué tipo de comida ofreces</p><span className="text-xs text-gray-500">{formData.description.length}/300</span></div>
      </div>
      <Input label="Dirección" value={formData.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Av. Principal, Local 12" icon={<MapPin className="w-4 h-4 text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Ciudad" value={formData.city} onChange={(e) => updateForm('city', e.target.value)} placeholder="Caracas" icon={<Building2 className="w-4 h-4 text-primary" />} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />País</label>
          <select value={formData.country} onChange={(e) => updateForm('country', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:border-primary focus:outline-none transition-all text-sm">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Teléfono" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+58 212 555 1234" icon={<Phone className="w-4 h-4 text-primary" />} />
        <Input label="Sitio web" value={formData.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://miweb.com" icon={<Link className="w-4 h-4 text-primary" />} />
      </div>
      <Input label="Instagram" value={formData.instagram} onChange={(e) => updateForm('instagram', e.target.value)} placeholder="@tu_negocio" />
    </div>
  );
}