'use client';

import { useParams } from 'next/navigation';
import { useShop } from '@/hooks/useShop';
import ShopDetailHeader from '@/components/shops/ShopDetailHeader';
import ShopDetailInfo from '@/components/shops/ShopDetailInfo';
import ShopDetailPacks from '@/components/shops/ShopDetailPacks';
import { useEffect } from 'react';
import PageLoader from '@/components/ui/PageLoader';
import { Store } from 'lucide-react';

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params.id as string;
  const { shop, packs, loading, error } = useShop(shopId);

  useEffect(() => {
    if (shop?.name) {
      document.title = shop.name + ' | Paporla';
    }
  }, [shop?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
        <div className="container mx-auto px-4 py-12">
          <PageLoader />
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <Store className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Comercio no encontrado</h2>
          <p className="text-gray-400">El comercio que buscas no existe o no esta disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205] pb-12">
      <ShopDetailHeader
        shop={{
          ...shop,
          packsCount: packs.length,
        }}
      />

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <ShopDetailInfo shop={shop} packsCount={packs.length} />
          <ShopDetailPacks packs={packs} shopName={shop.name} shopAddress={shop.address} />
        </div>
      </div>
    </div>
  );
}
