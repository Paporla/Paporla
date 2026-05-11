'use client';

import { useRouter } from 'next/navigation';
import { Heart, Store } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import FavoriteCard from '@/components/favorites/FavoriteCard';
import Button from '@/components/ui/Button';

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, loading, removeFavorite } = useFavorites();

  const handleRemove = async (shopId: string) => {
    await removeFavorite(shopId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-800 rounded-lg mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-black/40 border border-white/10 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No tienes favoritos</h2>
        <p className="text-gray-400 mb-6">
          Guarda tus comercios favoritos para encontrarlos fÃ¡cilmente despuÃ©s
        </p>
        <Button onClick={() => router.push('/shops')}>
          <Store className="w-4 h-4 mr-2" />
          Explorar comercios
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Mis Favoritos</h1>
        <p className="text-sm text-gray-400 mt-1">
          {favorites.length} {favorites.length === 1 ? 'comercio guardado' : 'comercios guardados'}
        </p>
      </div>

      {/* Lista de favoritos */}
      <div className="space-y-3">
        {favorites.map((fav) => (
          <FavoriteCard
            key={fav.id}
            id={fav.id}
            shop={fav.shop}
            onRemove={() => handleRemove(fav.shop_id)}
          />
        ))}
      </div>
    </div>
  );
}
