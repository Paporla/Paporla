-- ========================================================
-- PAPORLA - INDICES DE PERFORMANCE
-- ========================================================
-- Ejecutar despues de: 01_tables.sql
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON public.user_profiles(city);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_city ON public.shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_verified ON public.shops(verified);
CREATE INDEX IF NOT EXISTS idx_shops_banned ON public.shops(banned);
CREATE INDEX IF NOT EXISTS idx_shops_deleted ON public.shops(deleted_at);
CREATE INDEX IF NOT EXISTS idx_shops_created ON public.shops(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_packs_shop ON public.packs(shop_id);
CREATE INDEX IF NOT EXISTS idx_packs_active ON public.packs(is_active);
CREATE INDEX IF NOT EXISTS idx_packs_status ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_ends_at ON public.packs(ends_at);
CREATE INDEX IF NOT EXISTS idx_packs_created ON public.packs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packs_deleted ON public.packs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_packs_pickup_date ON public.packs(pickup_date);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shop ON public.reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_reservations_pack ON public.reservations(pack_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_pickup_code ON public.reservations(pickup_code);
CREATE INDEX IF NOT EXISTS idx_reservations_pickup_date ON public.reservations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON public.reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON public.reservations(payment_status);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_shop ON public.favorites(shop_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_reservation ON public.notifications(reservation_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON public.activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(type);
