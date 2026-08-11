-- ========================================================
-- PAPORLA — SQL para ejecutar en Supabase SQL Editor
-- ========================================================
-- Contiene todos los cambios necesarios tras la auditoria.
-- Ejecutar TODO junto en una sola query.
-- ========================================================

-- ========================================================
-- 1. TRIGGER: handle_new_user — respeta rol 'comercio'
-- ========================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Solo permitir 'user' o 'comercio' desde el metadata. Nunca admin/super_admin.
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'comercio') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'user'
    END,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- 2. STORAGE RLS — Políticas para buckets de imágenes
-- ========================================================

-- Limpiar TODAS las políticas anteriores de storage.objects
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END;
$$;

-- SELECT público para todos los buckets de imágenes
CREATE POLICY "storage_public_select" ON storage.objects
  FOR SELECT USING (bucket_id IN ('shop-images', 'pack-images', 'avatars'));

-- INSERT: cualquier usuario autenticado puede subir
CREATE POLICY "storage_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('shop-images', 'pack-images', 'avatars')
    AND auth.role() = 'authenticated'
  );

-- UPDATE/DELETE: solo el dueño (usando string_to_array)
CREATE POLICY "storage_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('shop-images', 'pack-images', 'avatars')
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "storage_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('shop-images', 'pack-images', 'avatars')
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ========================================================
-- 3. TRIGGER: notificar admins al crear usuario/comercio
-- ========================================================
DROP FUNCTION IF EXISTS public.notify_admins_on_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_comercio boolean;
BEGIN
  v_is_comercio := NEW.role = 'comercio';

  -- Insertar activity_log
  INSERT INTO public.activity_logs (user_id, type, severity, title, description)
  VALUES (
    NEW.id,
    CASE WHEN v_is_comercio THEN 'shop_created' ELSE 'user_registered' END,
    CASE WHEN v_is_comercio THEN 'warning' ELSE 'info' END,
    CASE WHEN v_is_comercio THEN 'Nuevo comercio pendiente de verificacion' ELSE 'Nuevo usuario registrado' END,
    NEW.name || ' (' || NEW.email || ') se registro como ' || NEW.role
  );

  -- Notificar a todos los admins y super_admins
  INSERT INTO public.notifications (user_id, type, message, is_read, sent_at)
  SELECT 
    a.id,
    CASE WHEN v_is_comercio THEN 'new_shop' ELSE 'new_user' END,
    NEW.name || ' (' || NEW.email || ') se registro como ' || NEW.role,
    false,
    NOW()
  FROM public.user_profiles a
  WHERE a.role IN ('admin', 'super_admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_user ON public.user_profiles;
CREATE TRIGGER trigger_notify_admins_on_new_user
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_user();

-- ========================================================
-- FIN
-- ========================================================

