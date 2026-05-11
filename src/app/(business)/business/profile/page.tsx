'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import Toast from '@/components/ui/Toast';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabs from './components/ProfileTabs';
import InfoTab from './components/InfoTab';
import ImagesTab from './components/ImagesTab';
import LocationTab from './components/LocationTab';
import HoursTab from './components/HoursTab';
import SettingsTab from './components/SettingsTab';
import ProfilePreview from './components/ProfilePreview';
import UnsavedChangesBar from './components/UnsavedChangesBar';

type Tab = 'info' | 'images' | 'location' | 'hours' | 'settings';
export interface HoursData {
  [key: string]: { open: string; close: string; closed: boolean };
}
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [previewMode, setPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Datos del formulario
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', address: '', city: '', country: 'VE',
    latitude: '', longitude: '', phone: '', website: '', instagram: '',
    logoUrl: '', coverUrl: '', verified: false,
  });
  const [hours, setHours] = useState<HoursData>(() => {
    const initial: HoursData = {};
    DAYS.forEach(day => { initial[day] = { open: '09:00', close: '18:00', closed: day === 'Domingo' }; });
    return initial;
  });

  useEffect(() => {
    if (user?.id) loadShop();
  }, [user]);

  const loadShop = async () => {
    const { data } = await supabase.from('shops').select('*').eq('owner_id', user?.id).maybeSingle();
    if (data) {
      setShop(data);
      setFormData({
        name: data.name || '', description: data.description || '', category: data.category || '',
        address: data.address || '', city: data.city || '', country: data.country || 'VE',
        latitude: data.latitude ? data.latitude.toString() : '', longitude: data.longitude ? data.longitude.toString() : '',
        phone: data.phone || '', website: data.website || '', instagram: data.instagram || '',
        logoUrl: data.logo_url || '', coverUrl: data.cover_url || '', verified: data.verified || false,
      });
      if (data.hours) try { setHours(prev => ({ ...prev, ...JSON.parse(data.hours) })); } catch(e) {}
    }
    setLoading(false);
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  if (loading) return <LoadingSkeleton />;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || 'VE',
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        phone: formData.phone || null,
        website: formData.website || null,
        instagram: formData.instagram || null,
        logo_url: formData.logoUrl || null,
        cover_url: formData.coverUrl || null,
        hours: JSON.stringify(hours),
      };

      const { error } = await supabase
        .from('shops')
        .update(updates)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setToast({ message: 'Cambios guardados exitosamente', type: 'success' });
      setIsDirty(false);
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'La geolocalizacion no esta disponible en este navegador', type: 'error' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm('latitude', position.coords.latitude.toString());
        updateForm('longitude', position.coords.longitude.toString());
        setToast({ message: 'Ubicacion detectada correctamente', type: 'success' });
      },
      (err) => {
        setToast({ message: 'Error al detectar ubicacion: ' + err.message, type: 'error' });
      }
    );
  };

  const handleDiscard = async () => {
    if (shop) {
      setFormData({
        name: shop.name || '', description: shop.description || '', category: shop.category || '',
        address: shop.address || '', city: shop.city || '', country: shop.country || 'VE',
        latitude: shop.latitude ? shop.latitude.toString() : '', longitude: shop.longitude ? shop.longitude.toString() : '',
        phone: shop.phone || '', website: shop.website || '', instagram: shop.instagram || '',
        logoUrl: shop.logo_url || '', coverUrl: shop.cover_url || '', verified: shop.verified || false,
      });
    }
    setIsDirty(false);
  };

  if (previewMode) {
    return <ProfilePreview formData={formData} hours={hours} onBack={() => setPreviewMode(false)} />;
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        shopName={formData.name}
        verified={formData.verified}
        completionPercentage={Object.values(formData).filter(v => v).length * 10}
        onPreview={() => setPreviewMode(true)}
      />
      <UnsavedChangesBar isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} saving={saving} />
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={[
        { id: 'info', label: 'Información', icon: 'Store' },
        { id: 'images', label: 'Imágenes', icon: 'Image' },
        { id: 'location', label: 'Ubicación', icon: 'MapPin' },
        { id: 'hours', label: 'Horarios', icon: 'Clock' },
        { id: 'settings', label: 'Ajustes', icon: 'Settings' },
      ]} />
      {activeTab === 'info' && <InfoTab formData={formData} updateForm={updateForm} />}
      {activeTab === 'images' && <ImagesTab formData={formData} updateForm={updateForm} bucket="shop-images" />}
      {activeTab === 'location' && <LocationTab formData={formData} updateForm={updateForm} onDetectLocation={detectLocation} locating={false} />}
      {activeTab === 'hours' && <HoursTab hours={hours} updateHours={(day, field, value) => {
          setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
          setIsDirty(true);
        }} />}
      {activeTab === 'settings' && <SettingsTab onDelete={async () => {
          if (!confirm('Esta accion eliminara tu comercio permanentemente. Estas seguro?')) return;
          const { error } = await supabase.from('shops').delete().eq('owner_id', user?.id);
          if (error) setToast({ message: error.message, type: 'error' });
          else window.location.href = '/business';
        }} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}