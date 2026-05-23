-- ========================================================
-- PAPORLA - POLITICAS RLS (Row Level Security)
-- ========================================================
-- Ejecutar despues de: 06_rpc_functions.sql
-- ========================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_admin_all" ON public.user_profiles FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- shops
DROP POLICY IF EXISTS "shops_select_public" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_manage" ON public.shops;
DROP POLICY IF EXISTS "shops_admin_all" ON public.shops;
CREATE POLICY "shops_select_public" ON public.shops FOR SELECT USING (deleted_at IS NULL AND banned = false);
CREATE POLICY "shops_owner_manage" ON public.shops FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "shops_admin_all" ON public.shops FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- packs
DROP POLICY IF EXISTS "packs_select_public" ON public.packs;
DROP POLICY IF EXISTS "packs_owner_manage" ON public.packs;
DROP POLICY IF EXISTS "packs_admin_all" ON public.packs;
CREATE POLICY "packs_select_public" ON public.packs FOR SELECT USING (deleted_at IS NULL AND is_active = true AND remaining_stock > 0);
CREATE POLICY "packs_owner_manage" ON public.packs FOR ALL USING (EXISTS (SELECT 1 FROM public.shops WHERE id = packs.shop_id AND owner_id = auth.uid()));
CREATE POLICY "packs_admin_all" ON public.packs FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- reservations
DROP POLICY IF EXISTS "reservations_select_client" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_merchant" ON public.reservations;
DROP POLICY IF EXISTS "reservations_client_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_client_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_admin_all" ON public.reservations;
CREATE POLICY "reservations_select_client" ON public.reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reservations_select_merchant" ON public.reservations FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops WHERE id = reservations.shop_id AND owner_id = auth.uid()));
CREATE POLICY "reservations_client_insert" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Solo permite actualizar columnas NO-criticas (cancel_reason, etc.)
-- El status solo debe cambiarse via RPC functions (cancel_reservation, validate_pickup, etc.)
CREATE POLICY "reservations_client_update" ON public.reservations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_admin_all" ON public.reservations FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- favorites
DROP POLICY IF EXISTS "favorites_client_all" ON public.favorites;
CREATE POLICY "favorites_client_all" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_business" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "notifications_business" ON public.notifications FOR SELECT USING (EXISTS (SELECT 1 FROM public.reservations r JOIN public.shops s ON s.id = r.shop_id WHERE r.id = notifications.reservation_id AND s.owner_id = auth.uid()));
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_logs_admin_all" ON public.activity_logs FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));
