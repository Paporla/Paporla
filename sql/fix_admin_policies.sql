-- ============================================
-- PERMITIR QUE ADMIN Y SUPER_ADMIN GESTIONEN
-- cualquier comercio, pack, usuario, reserva
-- ============================================

-- 1. Permitir a admins actualizar cualquier comercio
DROP POLICY IF EXISTS "Admins can update any shop" ON shops;
CREATE POLICY "Admins can update any shop"
  ON shops FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 2. Permitir a admins eliminar cualquier comercio
DROP POLICY IF EXISTS "Admins can delete any shop" ON shops;
CREATE POLICY "Admins can delete any shop"
  ON shops FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 3. Permitir a admins ver todos los comercios (incluyendo baneados/eliminados)
DROP POLICY IF EXISTS "Admins can view all shops" ON shops;
CREATE POLICY "Admins can view all shops"
  ON shops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 4. Permitir a admins gestionar cualquier pack
DROP POLICY IF EXISTS "Admins can manage any pack" ON packs;
CREATE POLICY "Admins can manage any pack"
  ON packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Permitir a admins ver cualquier reserva
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;
CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 6. Permitir a admins ver cualquier perfil de usuario
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- SIMPLIFICAR IMÁGENES
-- Permitir storage público para todo
-- ============================================

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;

-- Política: cualquiera puede leer archivos
CREATE POLICY "Public Read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('shop-images', 'pack-images', 'avatars'));

-- Política: usuarios autenticados pueden subir archivos
CREATE POLICY "Auth Upload" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id IN ('shop-images', 'pack-images', 'avatars')
  );
