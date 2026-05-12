-- ============================================
-- CREAR PERFILES PARA USUARIOS EXISTENTES
-- Ejecuta esto si ya te registraste antes de
-- crear el trigger on_auth_user_created
-- ============================================

INSERT INTO user_profiles (id, email, name, role, email_confirmed)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Usuario'),
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  u.email_confirmed_at IS NOT NULL
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
);

-- Ver los perfiles creados
SELECT * FROM user_profiles;
