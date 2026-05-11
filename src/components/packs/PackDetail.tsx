'use client';

import { useRouter } from 'next/navigation';
import type { PackWithShop } from '@/types/pack';
import PackDetailHeader from './PackDetailHeader';
import PackDetailHero from './PackDetailHero';
import PackDetailShopInfo from './PackDetailShopInfo';
import PackDetailContent from './PackDetailContent';
import PackDetailActions from './PackDetailActions';

interface PackDetailProps {
  pack: PackWithShop;
  onClose?: () => void;
}

export default function PackDetail({ pack, onClose }: PackDetailProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark overflow-y-auto">
      <PackDetailHeader
        title={pack.title}
        priceCents={pack.price_cents}
        originalPriceCents={pack.original_price_cents}
        remainingStock={pack.remaining_stock}
        totalStock={pack.total_stock}
        onBack={handleBack}
      />

      <PackDetailHero
        imageUrl={pack.image_url ?? null}  // ← Convertir undefined a null
        title={pack.title}
      />

      <div className="p-5 pb-32 space-y-6">
        <PackDetailShopInfo
          shopName={pack.shop.name}
          shopRating={pack.shop.rating || 0}
          shopVerified={pack.shop.verified}
          shopAddress={pack.shop.address}
          shopCity={pack.shop.city}
          shopPhone={pack.shop.phone}
          pickupDate={pack.pickup_date}
          pickupStartTime={pack.pickup_start_time}
          pickupEndTime={pack.pickup_end_time}
        />

        <PackDetailContent
          title={pack.title}
          description={pack.description}
          priceCents={pack.price_cents}
          originalPriceCents={pack.original_price_cents}
          endsAt={pack.ends_at ?? null}  // ← Convertir undefined a null
        />
      </div>

      <PackDetailActions
        packId={pack.id}
        shopId={pack.shop_id}
        priceCents={pack.price_cents}
        remainingStock={pack.remaining_stock}
        isActive={pack.is_active}
        onSuccess={onClose}
      />
    </div>
  );
}