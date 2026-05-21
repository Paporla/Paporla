'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Store, Search, Filter } from 'lucide-react';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import ShopsTable from '../components/ShopsTable';
import ShopModal from '../components/ShopModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Shop } from '@/types/shop';

export default function AdminShopsPage() {
  const { user: currentUser } = useAuth();
  const supabase = supabaseBrowser();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredShops(
        shops.filter(shop =>
          shop.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredShops(shops);
    }
  }, [searchTerm, shops]);

  const loadShops = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setShops(data || []);
      setFilteredShops(data || []);
    }
    setLoading(false);
  };

  const handleVerifyShop = async (shopId: string, verified: boolean) => {
    const { error } = await supabase
      .from('shops')
      .update({ verified })
      .eq('id', shopId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(verified ? 'Comercio verificado' : 'Verificación removida');
      await loadShops();
    }
    setModalOpen(false);
    setSelectedShop(null);
  };

  const handleBanShop = async (shopId: string, banned: boolean) => {
    const { error } = await supabase
      .from('shops')
      .update({ banned })
      .eq('id', shopId);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(banned ? 'Comercio baneado' : 'Ban removido');
      await loadShops();
    }
  };

  const confirmDelete = (shopId: string) => {
    setShopToDelete(shopId);
    setDeleteModalOpen(true);
  };

  const handleDeleteShop = async () => {
    if (!shopToDelete) return;

    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopToDelete);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Comercio eliminado correctamente');
      await loadShops();
    }
    setDeleteModalOpen(false);
    setShopToDelete(null);
  };

  const openShopModal = (shop: Shop) => {
    setSelectedShop(shop);
    setModalOpen(true);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (filteredShops.length === 0 && !loading) {
    return (
      <EmptyState
        type="search"
        action={{
          label: "Limpiar búsqueda",
          onClick: () => setSearchTerm('')
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">
              Gestión de Comercios
            </h1>
            <p className="dark:text-gray-400 text-gray-600 mt-1">
              Administra los comercios de la plataforma. Puedes verificar, banear o eliminar.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Total: {filteredShops.length} comercios
        </div>
      </div>

      {/* Tabla de comercios */}
      <ShopsTable
        shops={filteredShops}
        onEdit={openShopModal}
        onVerify={handleVerifyShop}
        onBan={handleBanShop}
        onDelete={confirmDelete}
      />

      {/* Modal de edición */}
      <ShopModal
        isOpen={modalOpen}
        shop={selectedShop}
        onClose={() => {
          setModalOpen(false);
          setSelectedShop(null);
        }}
        onVerify={handleVerifyShop}
        onBan={handleBanShop}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteShop}
        title="Eliminar comercio"
        message="¿Estás seguro de que quieres eliminar este comercio? Se eliminarán todos sus packs y reservas."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}