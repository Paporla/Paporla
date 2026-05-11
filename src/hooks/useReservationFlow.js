import { supabaseBrowser } from '@/lib/supabase/client';
import { useState } from 'react';

export function useReservationFlow() {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(false);

  const reservePack = async (packId, userId, userName) => {
    setLoading(true);
    
    try {
      // Crear la reserva en Supabase
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          user_id: userId,
          pack_id: packId,
          shop_id: (await supabase.from('packs').select('shop_id').eq('id', packId).single()).data.shop_id,
          quantity: 1,
          total_price_cents: (await supabase.from('packs').select('price_cents').eq('id', packId).single()).data.price_cents,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error reservando pack:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (reservationId) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'card'
        })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error confirmando pago:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ... otras funciones similares para el flujo completo

  return {
    reservePack,
    confirmPayment,
    loading
  };
}