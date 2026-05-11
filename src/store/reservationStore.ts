// ============================================
// STORE DE SIMULACIÓN DE RESERVAS
// ============================================
// Este store simula el backend completo para el FlowSimulator.
// No depende de Supabase - es pura lógica de frontend.
// ============================================

import { create } from 'zustand';
import type { SimulationPack, SimulationReservation, ReservationStatus, PackStatus } from '@/types/reservationFlow';

// Generador de códigos tipo P4P-XXX-XXX
function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `P4P-${part1}-${part2}`;
}

const INITIAL_PACKS: SimulationPack[] = [
  {
    id: 'pack-1',
    title: 'Pack de la Panadería Artesanal',
    shopName: 'Panadería Artesanal',
    shopEmoji: '🥖',
    price: 2.50,
    totalAvailable: 5,
    available: 5,
    reserved: 0,
    status: 'available',
    pickupStart: '19:00',
    pickupEnd: '20:00',
  },
  {
    id: 'pack-2',
    title: 'Pack de Sushi Premium',
    shopName: 'Sushi House',
    shopEmoji: '🍣',
    price: 4.99,
    totalAvailable: 3,
    available: 3,
    reserved: 0,
    status: 'available',
    pickupStart: '20:00',
    pickupEnd: '21:00',
  },
  {
    id: 'pack-3',
    title: 'Pack de Café Especial',
    shopName: 'Café de la Esquina',
    shopEmoji: '☕',
    price: 1.99,
    totalAvailable: 8,
    available: 8,
    reserved: 0,
    status: 'available',
    pickupStart: '18:00',
    pickupEnd: '19:00',
  },
];

interface ReservationStoreState {
  packs: SimulationPack[];
  reservations: SimulationReservation[];
  logs: string[];
  
  reservePack: (packId: string, userId: string, userName: string) => SimulationReservation | null;
  confirmPayment: (reservationId: string) => void;
  activatePickupWindow: (reservationId: string) => void;
  validatePickup: (pickupCode: string) => { userName: string; packTitle: string } | null;
  expireReservation: (reservationId: string) => void;
  cancelReservation: (reservationId: string) => void;
  rateReservation: (reservationId: string, rating: number) => void;
}

export const useReservationStore = create<ReservationStoreState>((set, get) => ({
  packs: INITIAL_PACKS,
  reservations: [],
  logs: [],

  reservePack: (packId, userId, userName) => {
    const state = get();
    const pack = state.packs.find(p => p.id === packId);
    if (!pack || pack.available <= 0) return null;

    const code = generatePickupCode();
    const newReservation: SimulationReservation = {
      id: `res-${Date.now()}`,
      packId: pack.id,
      packTitle: pack.title,
      shopName: pack.shopName,
      shopEmoji: pack.shopEmoji,
      userName,
      pickupCode: code,
      price: pack.price,
      status: 'pending',
    };

    // Actualizar pack
    const updatedPacks = state.packs.map(p => {
      if (p.id === packId) {
        const newAvailable = p.available - 1;
        const newReserved = p.reserved + 1;
        return {
          ...p,
          available: newAvailable,
          reserved: newReserved,
          status: newAvailable === 0 ? 'sold_out' as PackStatus : 'selling' as PackStatus,
        };
      }
      return p;
    });

    set({
      packs: updatedPacks,
      reservations: [...state.reservations, newReservation],
      logs: [
        `[${new Date().toLocaleTimeString()}] ${userName} reservó "${pack.title}" → Código: ${code}`,
        ...state.logs,
      ],
    });

    return newReservation;
  },

  confirmPayment: (reservationId) => {
    const state = get();
    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservationId) {
        return { ...r, status: 'confirmed' as ReservationStatus };
      }
      return r;
    });

    const reservation = state.reservations.find(r => r.id === reservationId);

    set({
      reservations: updatedReservations,
      logs: [
        `[${new Date().toLocaleTimeString()}] Pago confirmado para "${reservation?.packTitle}" (${reservation?.userName})`,
        ...state.logs,
      ],
    });
  },

  activatePickupWindow: (reservationId) => {
    const state = get();
    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservationId) {
        return { ...r, status: 'ready_pickup' as ReservationStatus };
      }
      return r;
    });

    const reservation = state.reservations.find(r => r.id === reservationId);
    
    // Actualizar pack status
    const updatedPacks = state.packs.map(p => {
      if (p.id === reservation?.packId) {
        return { ...p, status: 'pickup_window' as PackStatus };
      }
      return p;
    });

    set({
      reservations: updatedReservations,
      packs: updatedPacks,
      logs: [
        `[${new Date().toLocaleTimeString()}] 📦 Ventana de recogida activada para "${reservation?.packTitle}"`,
        ...state.logs,
      ],
    });
  },

  validatePickup: (pickupCode) => {
    const state = get();
    const reservation = state.reservations.find(r => r.pickupCode === pickupCode);
    
    if (!reservation || reservation.status !== 'ready_pickup') return null;

    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservation.id) {
        return { ...r, status: 'picked_up' as ReservationStatus };
      }
      return r;
    });

    set({
      reservations: updatedReservations,
      logs: [
        `[${new Date().toLocaleTimeString()}] ✅ Recogida validada: ${reservation.userName} recogió "${reservation.packTitle}"`,
        ...state.logs,
      ],
    });

    return { userName: reservation.userName, packTitle: reservation.packTitle };
  },

  expireReservation: (reservationId) => {
    const state = get();
    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservationId) {
        return { ...r, status: 'expired' as ReservationStatus };
      }
      return r;
    });

    const reservation = state.reservations.find(r => r.id === reservationId);

    set({
      reservations: updatedReservations,
      logs: [
        `[${new Date().toLocaleTimeString()}] ⏰ "${reservation?.packTitle}" expiró - ${reservation?.userName} perdió $${reservation?.price.toFixed(2)}`,
        ...state.logs,
      ],
    });
  },

  cancelReservation: (reservationId) => {
    const state = get();
    const reservation = state.reservations.find(r => r.id === reservationId);
    
    if (!reservation) return;

    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservationId) {
        return { ...r, status: 'cancelled' as ReservationStatus };
      }
      return r;
    });

    // Devolver stock al pack
    const updatedPacks = state.packs.map(p => {
      if (p.id === reservation.packId) {
        const newAvailable = p.available + 1;
        const newReserved = p.reserved - 1;
        return {
          ...p,
          available: newAvailable,
          reserved: Math.max(0, newReserved),
          status: newAvailable > 0 && p.status === 'sold_out' ? 'available' as PackStatus : p.status,
        };
      }
      return p;
    });

    set({
      reservations: updatedReservations,
      packs: updatedPacks,
      logs: [
        `[${new Date().toLocaleTimeString()}] 🔄 "${reservation.packTitle}" cancelado por ${reservation.userName} - Reembolso $${reservation.price.toFixed(2)}`,
        ...state.logs,
      ],
    });
  },

  rateReservation: (reservationId, rating) => {
    const state = get();
    const updatedReservations = state.reservations.map(r => {
      if (r.id === reservationId) {
        return { ...r, userRating: rating };
      }
      return r;
    });

    const reservation = state.reservations.find(r => r.id === reservationId);

    set({
      reservations: updatedReservations,
      logs: [
        `[${new Date().toLocaleTimeString()}] ⭐ ${reservation?.userName} calificó "${reservation?.packTitle}" con ${rating}/5`,
        ...state.logs,
      ],
    });
  },
}));
