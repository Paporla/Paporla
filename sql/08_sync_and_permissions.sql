-- ========================================================
-- PAPORLA - SINCRONIZACION Y PERMISOS
-- ========================================================
-- Ejecutar ultimo: 08_sync_and_permissions.sql
-- ========================================================

-- Sincronizar usuarios existentes de Auth
INSERT INTO public.user_profiles (id, email, name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'user'
FROM auth.users ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PERMISOS MINIMOS POR PRINCIPIO DE MENOR PRIVILEGIO
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- anon (usuario no autenticado) solo puede SELECT en tablas publicas
GRANT SELECT ON public.shops TO anon;
GRANT SELECT ON public.packs TO anon;
GRANT SELECT ON public.user_profiles TO anon;
GRANT SELECT ON public.activity_logs TO anon;

-- authenticated (usuario logueado) tiene acceso completo segun RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.activity_logs TO authenticated;

-- service_role (backend) tiene acceso completo
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- FUNCIONES: Solo permitir EXECUTE en las que cada rol necesita
-- ============================================
-- anon: solo funciones de lectura publica
GRANT EXECUTE ON FUNCTION public.get_user_role TO anon;

-- authenticated: funciones que requieren autenticacion
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pickup_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reservation_atomic(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pickup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shop_rating(uuid, double precision) TO authenticated;

-- admin: funciones de administracion
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_shop(uuid) TO authenticated;

-- service_role: funciones de cron/mantenimiento
GRANT EXECUTE ON FUNCTION public.expire_reservations TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_pending_reservations(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_pickup_code TO service_role;
GRANT EXECUTE ON FUNCTION public.create_reservation_atomic(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_pickup(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_shop_rating(uuid, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_shop(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits TO service_role;
