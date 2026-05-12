// ============================================
// TIPOS PARA EL FLUJO DE RESERVAS (Simulador)
// ============================================

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_pickup'
  | 'picked_up'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export type PackStatus =
  | 'available'
  | 'selling'
  | 'sold_out'
  | 'pickup_window'
  | 'expired';

export interface SimulationPack {
  id: string;
  title: string;
  shopName: string;
  shopEmoji: string;
  price: number;
  totalAvailable: number;
  available: number;
  reserved: number;
  status: PackStatus;
  pickupStart: string;
  pickupEnd: string;
}

export interface SimulationReservation {
  id: string;
  packId: string;
  packTitle: string;
  shopName: string;
  shopEmoji: string;
  userName: string;
  pickupCode: string;
  price: number;
  status: ReservationStatus;
  userRating?: number;
}

export interface SimulationStore {
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
