-- ============================================
-- 1. CONVERTIR USUARIO A ADMIN/SUPER_ADMIN
-- ============================================
-- CAMBIA 'tu-email@ejemplo.com' por tu correo
-- y 'super_admin' por el rol que quieras
-- Roles disponibles: user, comercio, admin, super_admin

UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'tu-email@ejemplo.com';

-- Para verificar:
SELECT id, email, name, role FROM user_profiles WHERE role IN ('admin', 'super_admin');

-- ============================================
-- 2. CREAR PERFIL SI NO EXISTE (FIX)
-- ============================================
INSERT INTO user_profiles (id, email, name, role, email_confirmed)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  u.email_confirmed_at IS NOT NULL
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);
