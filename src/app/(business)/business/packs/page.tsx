'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Edit, Trash2, Eye, EyeOff, Search, 
  AlertCircle, CheckCircle, Clock, Copy
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatPrice } from '@/lib/utils/formatPrice';
import { formatDate } from '@/lib/utils/formatDate';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';

interface Pack {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  total_stock: number;
  remaining_stock: number;
  is_active: boolean;
  created_at: string;
  ends_at: string | null;
  image_url: string | null;
}

export default function BusinessPacksPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [shopId, setShopId] = useState<string | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [filteredPacks, setFilteredPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadShopAndPacks();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredPacks(
        packs.filter(pack =>
          pack.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredPacks(packs);
    }
  }, [searchTerm, packs]);

  const loadShopAndPacks = async () => {
    if (!user) return;
    setLoading(true);

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id, verified')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (shopError) {
      setError(shopError.message);
      setLoading(false);
      return;
    }

    setShopId(shopData?.id || null);

    const { data: packsData, error: packsError } = await supabase
      .from('packs')
      .select('*')
      .eq('shop_id', shopData?.id)
      .order('created_at', { ascending: false });

    if (packsError) {
      setError(packsError.message);
    } else {
      setPacks(packsData || []);
      setFilteredPacks(packsData || []);
    }
    setLoading(false);
  };

  const togglePackStatus = async (packId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('packs')
      .update({ is_active: !currentStatus })
      .eq('id', packId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(`Pack ${!currentStatus ? 'activado' : 'desactivado'} correctamente`);
      await loadShopAndPacks();
    }
  };

    const confirmDelete = (packId: string) => {
    setPackToDelete(packId);
    setModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!packToDelete) return;
    
    setDeleting(packToDelete);
    // Soft delete: desactivar en vez de eliminar
    // (no se puede eliminar si tiene reservas activas por FK constraint)
    const { error } = await supabase
      .from('packs')
      .update({
        is_active: false
      })
      .eq('id', packToDelete);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Pack desactivado correctamente');
      await loadShopAndPacks();
    }
    setDeleting(null);
    setModalOpen(false);
    setPackToDelete(null);
  };

  const getStockStatus = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return { label: 'Agotado', color: 'bg-red-500/20 text-red-400', icon: AlertCircle };
    if (percentage < 20) return { label: 'Stock bajo', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle };
    return { label: 'Disponible', color: 'bg-green-500/20 text-green-400', icon: CheckCircle };
  };

  const stats = {
    total: packs.length,
    active: packs.filter(p => p.is_active).length,
    inactive: packs.filter(p => !p.is_active).length,
    lowStock: packs.filter(p => p.remaining_stock > 0 && p.remaining_stock / p.total_stock < 0.2).length,
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Mis Packs
              </h1>
              <p className="text-gray-400">Gestiona todos tus packs de rescate alimentario</p>
            </div>
            <Link href="/business/packs/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crear nuevo pack
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total packs', value: stats.total, icon: Package, color: 'text-primary' },
          { label: 'Activos', value: stats.active, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Inactivos', value: stats.inactive, icon: EyeOff, color: 'text-gray-400' },
          { label: 'Stock bajo', value: stats.lowStock, icon: AlertCircle, color: 'text-yellow-400' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card glass className="p-4 text-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Buscar packs por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPacks.length === 0 ? (
        <Card glass className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <p className="text-gray-400">No tienes packs creados</p>
          <p className="text-xs text-gray-500 mt-1">Comienza a crear tu primer pack de rescate alimentario</p>
          <Link href="/business/packs/new">
            <Button className="mt-4">Crear mi primer pack</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPacks.map((pack, index) => {
            const stockStatus = getStockStatus(pack.remaining_stock, pack.total_stock);
            const StockIcon = stockStatus.icon;

            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card glass hover className="p-5 group">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                          {pack.title}
                        </h3>
                        {pack.is_active ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                        <span className={`text-xs ${stockStatus.color} px-2 py-0.5 rounded-full flex items-center gap-1`}>
                          <StockIcon className="w-3 h-3" /> {stockStatus.label}
                        </span>
                      </div>
                      
                      {pack.description && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-1">{pack.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-primary font-semibold text-lg">
                          {formatPrice(pack.price_cents)}
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Stock: {pack.remaining_stock}/{pack.total_stock}
                        </span>
                        {pack.ends_at && (
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Vigente hasta: {formatDate(pack.ends_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link href={`/business/packs/${pack.id}/duplicate`}>
                                                <Button variant="outline" size="sm" className="p-2">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/business/packs/${pack.id}`}>
                        <Button variant="outline" size="sm" className="p-2">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant={pack.is_active ? "outline" : "primary"}
                        size="sm"
                        onClick={() => togglePackStatus(pack.id, pack.is_active)}
                        className="p-2"
                      >
                        {pack.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDelete(pack.id)}
                        disabled={deleting === pack.id}
                        className="p-2"
                      >
                        {deleting === pack.id ? '...' : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Barra de progreso de stock */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Stock restante</span>
                      <span>{Math.round((pack.remaining_stock / pack.total_stock) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                        style={{ width: `${(pack.remaining_stock / pack.total_stock) * 100}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleDeactivate}
        title="Eliminar pack"
        message="¿Estás seguro de que quieres desactivar este pack? Se ocultará de la vista pública pero las reservas activas seguirán vigentes."
        confirmText="Sí, desactivar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}