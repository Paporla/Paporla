-- ========================================================
-- PAPORLA - SINCRONIZACION Y PERMISOS
-- ========================================================
-- Ejecutar ultimo: 08_sync_and_permissions.sql
-- ========================================================

-- Sincronizar usuarios existentes de Auth
INSERT INTO public.user_profiles (id, email, name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'user'
FROM auth.users ON CONFLICT (id) DO NOTHING;

-- Permisos para funciones SECURITY DEFINER
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
