// ============================================
// HOOK DE SIMULACIÓN INLINE (standalone)
// Reemplazo del store eliminado reservationStore.ts
// ============================================
// Este hook proporciona funcionalidad de simulación
// sin dependencias externas de store.
// ============================================

import { useState, useCallback } from 'react'
import type { SimulationPack, SimulationReservation, ReservationStatus } from '@/types/reservationFlow'

function generatePickupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `PAP-${part1}-${part2}`
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
]

export function useSimulationStore() {
  const [packs, setPacks] = useState<SimulationPack[]>(INITIAL_PACKS)
  const [reservations, setReservations] = useState<SimulationReservation[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }, [])

  const reservePack = useCallback((packId: string, _userId: string, userName: string): SimulationReservation | null => {
    const pack = packs.find(p => p.id === packId)
    if (!pack || pack.available <= 0) return null

    const code = generatePickupCode()
    const newRes: SimulationReservation = {
      id: `res-${Date.now()}`,
      packId: pack.id,
      packTitle: pack.title,
      shopName: pack.shopName,
      shopEmoji: pack.shopEmoji,
      userName,
      pickupCode: code,
      price: pack.price,
      status: 'pending',
    }

    setPacks(prev => prev.map(p =>
      p.id === packId
        ? { ...p, available: p.available - 1, reserved: p.reserved + 1, status: p.available - 1 === 0 ? 'sold_out' : 'selling' }
        : p
    ))
    setReservations(prev => [...prev, newRes])
    addLog(`${userName} reservó "${pack.title}" → Código: ${code}`)
    return newRes
  }, [packs, addLog])

  const confirmPayment = useCallback((reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'confirmed' as ReservationStatus } : r))
    const res = reservations.find(r => r.id === reservationId)
    addLog(`Pago confirmado para "${res?.packTitle}" (${res?.userName})`)
  }, [reservations, addLog])

  const activatePickupWindow = useCallback((reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'ready_pickup' as ReservationStatus } : r))
    const res = reservations.find(r => r.id === reservationId)
    if (res) {
      setPacks(prev => prev.map(p => p.id === res.packId ? { ...p, status: 'pickup_window' } : p))
    }
    addLog(`📦 Ventana de recogida activada para "${res?.packTitle}"`)
  }, [reservations, addLog])

  const validatePickup = useCallback((pickupCode: string): { userName: string; packTitle: string } | null => {
    const reservation = reservations.find(r => r.pickupCode === pickupCode)
    if (!reservation || reservation.status !== 'ready_pickup') return null

    setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, status: 'picked_up' as ReservationStatus } : r))
    addLog(`✅ Recogida validada: ${reservation.userName} recogió "${reservation.packTitle}"`)
    return { userName: reservation.userName, packTitle: reservation.packTitle }
  }, [reservations, addLog])

  const expireReservation = useCallback((reservationId: string) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'expired' as ReservationStatus } : r))
    const res = reservations.find(r => r.id === reservationId)
    addLog(`⏰ "${res?.packTitle}" expiró - ${res?.userName} perdió $${res?.price.toFixed(2)}`)
  }, [reservations, addLog])

  const cancelReservation = useCallback((reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId)
    if (!reservation) return

    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status: 'cancelled' as ReservationStatus } : r))
    setPacks(prev => prev.map(p =>
      p.id === reservation.packId
        ? { ...p, available: p.available + 1, reserved: Math.max(0, p.reserved - 1), status: 'available' }
        : p
    ))
    addLog(`🔄 "${reservation.packTitle}" cancelado por ${reservation.userName} - Reembolso $${reservation.price.toFixed(2)}`)
  }, [reservations, addLog])

  const rateReservation = useCallback((reservationId: string, rating: number) => {
    setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, userRating: rating } : r))
    const res = reservations.find(r => r.id === reservationId)
    addLog(`⭐ ${res?.userName} calificó "${res?.packTitle}" con ${rating}/5`)
  }, [reservations, addLog])

  return {
    packs, reservations, logs,
    reservePack, confirmPayment, activatePickupWindow,
    validatePickup, expireReservation, cancelReservation, rateReservation,
  }
}
