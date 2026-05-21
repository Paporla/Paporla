'use client';

import { Building2, Store, Globe, MapPin, Phone, Link } from 'lucide-react';
import Input from '@/components/ui/Input';

const CATEGORIES = [
  { id: 'bakery', name: 'Panaderia' }, { id: 'restaurant', name: 'Restaurante' },
  { id: 'cafe', name: 'Cafeteria' }, { id: 'pizzeria', name: 'Pizzeria' },
  { id: 'sushi', name: 'Sushi / Japones' }, { id: 'fruit', name: 'Fruteria' },
  { id: 'pastry', name: 'Pasteleria' }, { id: 'supermarket', name: 'Supermercado' },
  { id: 'fastfood', name: 'Comida rapida' }, { id: 'other', name: 'Otro' },
];

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' }, { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' }, { code: 'PE', name: 'Peru' },
  { code: 'CL', name: 'Chile' }, { code: 'VE', name: 'Venezuela' },
];

interface InfoTabProps {
  formData: any;
  updateForm: (field: string, value: string) => void;
}

export default function InfoTab({ formData, updateForm }: InfoTabProps) {
  return (
    <div className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-6">
      <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        Informacion del negocio
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Nombre del comercio" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Mi Restaurante" required />
        <div className="space-y-2">
          <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2"><Store className="w-4 h-4 text-primary" />Categoria</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => updateForm('category', cat.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${formData.category === cat.id ? 'bg-primary/10 border border-primary/30 dark:text-white text-gray-900' : 'dark:bg-black/40 bg-gray-100 dark:border-white/10 border-gray-200 dark:text-gray-400 text-gray-600 hover:border-white/20'}`}>
                <span className="text-xs">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium dark:text-gray-300 text-gray-700">Descripcion</label>
        <textarea value={formData.description} onChange={(e) => updateForm('description', e.target.value)} rows={4} maxLength={300}
          className="w-full px-4 py-3 rounded-xl dark:bg-black/40 bg-gray-50 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 placeholder-gray-500 focus:border-primary focus:outline-none transition-all text-sm resize-none"
          placeholder="Describe tu negocio, especialidades, horarios de recogida de packs..." />
        <div className="flex justify-between"><p className="text-xs dark:text-gray-500 text-gray-400">Describe que tipo de comida ofreces</p><span className="text-xs dark:text-gray-500 text-gray-400">{formData.description.length}/300</span></div>
      </div>
      <Input label="Direccion" value={formData.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Av. Principal, Local 12" icon={<MapPin className="w-4 h-4 text-primary" />} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Ciudad" value={formData.city} onChange={(e) => updateForm('city', e.target.value)} placeholder="Caracas" icon={<Building2 className="w-4 h-4 text-primary" />} />
        <div className="space-y-2">
          <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />Pais</label>
          <select value={formData.country} onChange={(e) => updateForm('country', e.target.value)}
            className="w-full px-4 py-3 rounded-xl dark:bg-black/40 bg-gray-50 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:outline-none transition-all text-sm">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Telefono" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+58 212 555 1234" icon={<Phone className="w-4 h-4 text-primary" />} />
        <Input label="Sitio web" value={formData.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://miweb.com" icon={<Link className="w-4 h-4 text-primary" />} />
      </div>
      <Input label="Instagram" value={formData.instagram} onChange={(e) => updateForm('instagram', e.target.value)} placeholder="@tu_negocio" />
    </div>
  );
}
