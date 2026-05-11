'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, Clock, DollarSign, Tag, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import { supabaseBrowser } from '@/lib/supabase/client';
import ImageUpload from '@/components/ui/ImageUpload';

interface Pack {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  original_price_cents: number | null;
  total_stock: number;
  remaining_stock: number;
  pickup_date: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface PackFormSimplifiedProps {
  shopId: string;
  pack?: Pack;
  isDuplicate?: boolean;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: 'panaderia', name: '🥖 Panadería', template: { title: 'Pack Panadería Artesanal', description: 'Pan recién horneado, croissants y pastelería', price_cents: 1999, original_price_cents: 5999 } },
  { id: 'sushi', name: '🍣 Sushi', template: { title: 'Pack Sushi Sorpresa', description: 'Sushi variado del día', price_cents: 3999, original_price_cents: 12999 } },
  { id: 'pizza', name: '🍕 Pizza', template: { title: 'Pack Pizza Familiar', description: 'Pizza grande 4 quesos o pepperoni', price_cents: 4999, original_price_cents: 14999 } },
  { id: 'cafe', name: '☕ Café', template: { title: 'Pack Café de Especialidad', description: 'Café artesanal + croissant', price_cents: 1499, original_price_cents: 4499 } },
  { id: 'healthy', name: '🥗 Saludable', template: { title: 'Pack Bowl Vegano', description: 'Ensalada fresca con quinoa y vegetales', price_cents: 2499, original_price_cents: 7999 } },
];

export default function PackFormSimplified({ shopId, pack, isDuplicate = false, onSuccess }: PackFormSimplifiedProps) {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const isEditing = !!pack && !isDuplicate;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [shopLogo, setShopLogo] = useState('');

  // Inicializar datos
  const getInitialData = () => {
    if (pack && !isDuplicate) {
      return {
        title: pack.title,
        description: pack.description || '',
        price_cents: pack.price_cents,
        original_price_cents: pack.original_price_cents || 0,
        total_stock: pack.total_stock,
        pickup_date: pack.pickup_date || '',
        pickup_start_time: pack.pickup_start_time?.slice(0, 5) || '',
        pickup_end_time: pack.pickup_end_time?.slice(0, 5) || '',
        
        image_url: pack.image_url || '',
        is_active: pack.is_active,
      };
    }
    return {
      title: '',
      description: '',
      price_cents: 0,
      original_price_cents: 0,
      total_stock: 1,
      pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      pickup_start_time: '',
      pickup_end_time: '',
      
      image_url: '',
      is_active: true,
    };
  };

  const [formData, setFormData] = useState(getInitialData());

    // Cargar logo del comercio como imagen por defecto
  useEffect(() => {
    const loadShopLogo = async () => {
      const { data } = await supabase
        .from('shops')
        .select('logo_url')
        .eq('id', shopId)
        .maybeSingle();
      if (data?.logo_url && !formData.image_url) {
        setFormData(prev => ({ ...prev, image_url: data.logo_url! }));
        setShopLogo(data.logo_url!);
      }
    };
    if (!isEditing) loadShopLogo();
  }, [shopId]);

  // Aplicar plantilla de categoría
  const applyCategory = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (category) {
      setFormData({
        ...formData,
        title: category.template.title,
        description: category.template.description,
        price_cents: category.template.price_cents,
        original_price_cents: category.template.original_price_cents,
      });
      setSelectedCategory(categoryId);
    }
  };

  const discount = formData.original_price_cents && formData.original_price_cents > formData.price_cents
    ? Math.round((1 - formData.price_cents / formData.original_price_cents) * 100)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.title.trim()) {
      setError('El título es requerido');
      setLoading(false);
      return;
    }

    if (formData.price_cents <= 0) {
      setError('El precio debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (formData.total_stock <= 0) {
      setError('El stock debe ser mayor a 0');
      setLoading(false);
      return;
    }

    try {
      const packData = {
        shop_id: shopId,
        title: formData.title,
        description: formData.description || null,
        price_cents: formData.price_cents,
        original_price_cents: formData.original_price_cents || null,
        total_stock: formData.total_stock,
        remaining_stock: formData.total_stock,
        pickup_date: formData.pickup_date || null,
        pickup_start_time: formData.pickup_start_time || null,
        pickup_end_time: formData.pickup_end_time || null,
        
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      };

      if (isEditing && pack) {
        const { error } = await supabase
          .from('packs')
          .update(packData)
          .eq('id', pack.id);
        if (error) throw error;
        setSuccess('Pack actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('packs')
          .insert(packData);
        if (error) throw error;
        setSuccess(isDuplicate ? 'Pack duplicado correctamente' : 'Pack creado correctamente');
      }

      setTimeout(() => {
        router.push('/business/packs');
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Plantillas rapidas (opcional)
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => applyCategory(cat.id)}
              className={"px-4 py-2 rounded-full text-sm transition-all " + (selectedCategory === cat.id ? "bg-primary text-black font-medium" : "bg-white/5 text-gray-400 hover:bg-white/10")}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Informacion del Pack
          </h2>

          <div className="space-y-4">
            <Input label="Titulo del pack *" placeholder="Ej: Pack Sorpresa Vegano"
              value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              icon={<Tag className="w-4 h-4" />} required />

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Descripcion (opcional)</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-all"
                placeholder="Describe lo que incluye el pack..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Precio (USD) *" type="number" step="0.01" placeholder="9.99"
                value={formData.price_cents / 100} onChange={(e) => setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                icon={<DollarSign className="w-4 h-4" />} required />

              <Input label="Precio original (opcional)" type="number" step="0.01" placeholder="24.99"
                value={formData.original_price_cents / 100 || ""} onChange={(e) => setFormData({ ...formData, original_price_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 })}
                icon={<DollarSign className="w-4 h-4" />} />

              <Input label="Stock disponible *" type="number" placeholder="10"
                value={formData.total_stock} onChange={(e) => setFormData({ ...formData, total_stock: parseInt(e.target.value) || 0 })}
                icon={<Package className="w-4 h-4" />} required />
            </div>

            {discount && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
                <Tag className="w-4 h-4" />
                <span>Descuento aplicado: {discount}%</span>
              </div>
            )}

            <ImageUpload bucket="pack-images" path={"packs/" + shopId}
              existingImage={formData.image_url}
              onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
              onError={(err) => setError(err)} label="Imagen del pack" />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Recogida
            </h2>
            <span className="text-xs text-gray-500">Opcional - se auto-completa</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Hoy", days: 0 },
              { label: "Manana", days: 1 },
              { label: "Pasado manana", days: 2 },
            ].map(opt => {
              const d = new Date(Date.now() + opt.days * 86400000);
              const dateStr = d.toISOString().split("T")[0];
              return (
                <button key={opt.label} type="button"
                  onClick={() => setFormData({ ...formData, pickup_date: dateStr })}
                  className={"px-4 py-2 rounded-full text-sm " + (formData.pickup_date === dateStr ? "bg-primary text-black font-medium" : "bg-white/5 text-gray-400 hover:bg-white/10")}
                >
                  {opt.label} ({d.toLocaleDateString("es-ES", { weekday: "short" })})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <Input label="Fecha" type="date" value={formData.pickup_date}
                onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                icon={<Calendar className="w-4 h-4" />} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Desde</label>
              <div className="flex gap-2 flex-wrap">
                {["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "16:00", "18:00"].map(t => (
                  <button key={t} type="button"
                    onClick={() => setFormData({ ...formData, pickup_start_time: t })}
                    className={"px-3 py-1.5 rounded-lg text-xs " + (formData.pickup_start_time === t ? "bg-primary text-black font-medium" : "bg-white/5 text-gray-400 hover:bg-white/10")}
                  >
                    {t}
                  </button>
                ))}
                <Input type="time" value={formData.pickup_start_time}
                  onChange={(e) => setFormData({ ...formData, pickup_start_time: e.target.value })}
                  className="w-28" placeholder="Hora" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Hasta</label>
              <div className="flex gap-2 flex-wrap">
                {["10:00", "12:00", "14:00", "16:00", "18:00", "19:00", "20:00", "21:00"].map(t => (
                  <button key={t} type="button"
                    onClick={() => setFormData({ ...formData, pickup_end_time: t })}
                    className={"px-3 py-1.5 rounded-lg text-xs " + (formData.pickup_end_time === t ? "bg-primary text-black font-medium" : "bg-white/5 text-gray-400 hover:bg-white/10")}
                  >
                    {t}
                  </button>
                ))}
                <Input type="time" value={formData.pickup_end_time}
                  onChange={(e) => setFormData({ ...formData, pickup_end_time: e.target.value })}
                  className="w-28" placeholder="Hora" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            <Package className="w-4 h-4 mr-2" />
            {loading ? "Guardando..." : (isEditing ? "Actualizar Pack" : isDuplicate ? "Duplicar Pack" : "Crear Pack")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>

      {error && <Toast message={error} type="error" onClose={() => setError("")} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess("")} />}
    </div>
  );
}
