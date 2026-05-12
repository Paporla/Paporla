-- ============================================
-- MIGRACIONES Y POLICIES SUPABASE
-- ============================================
-- Pegar esto en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. COLUMNAS FALTANTES EN TABLAS EXISTENTES
-- ============================================

-- user_profiles: paÃ­s para LATAM
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text;

-- shops: coordenadas para mapa + paÃ­s
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float,
ADD COLUMN IF NOT EXISTS opening_hours jsonb;

-- reservations: datos de recogida (si no existen)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS pickup_date date,
ADD COLUMN IF NOT EXISTS pickup_start_time time,
ADD COLUMN IF NOT EXISTS pickup_end_time time;

-- ============================================
-- 2. CONSTRAINT: status de reserva
-- ============================================

-- Solo si quieres forzar a nivel DB:
-- ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
-- ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
--   CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- ============================================
-- 3. RLS POLICIES PARA COMERCIOS
-- ============================================

-- Commerce puede VER todas las reservas de su shop
CREATE POLICY "Comercio puede ver sus reservas" 
ON reservations FOR SELECT 
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Commerce puede ACTUALIZAR estado de sus reservas
CREATE POLICY "Comercio puede gestionar sus reservas" 
ON reservations FOR UPDATE 
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- Commerce puede LEER datos de usuarios que les compraron
CREATE POLICY "Comercio puede ver compradores"
ON user_profiles FOR SELECT
USING (
  id IN (
    SELECT user_id FROM reservations 
    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
);

-- Commerce puede LEER packs de otros comercios? No, solo los suyos
-- Ya deberÃ­a existir esta policy:
CREATE POLICY "Comercio puede gestionar sus packs"
ON packs FOR ALL
USING (
  shop_id IN (
    SELECT id FROM shops WHERE owner_id = auth.uid()
  )
);

-- ============================================
-- 4. POLICIES PARA USUARIOS (verificar)
-- ============================================

-- Usuario puede ver SOLO sus reservas
CREATE POLICY "Usuario puede ver sus reservas"
ON reservations FOR SELECT
USING (auth.uid() = user_id);

-- Usuario puede crear reservas
CREATE POLICY "Usuario puede crear reservas"
ON reservations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuario puede cancelar sus reservas (solo si estÃ¡n pendientes o confirmadas)
CREATE POLICY "Usuario puede cancelar sus reservas"
ON reservations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND status IN ('cancelled')
  -- Solo permite cambiar a cancelled, no a otros estados
);

-- ============================================
-- 5. FUNCIÃ“N: auto-expirado de reservas (para Edge Function)
-- ============================================

-- Esta funciÃ³n la llamarÃ¡ la Edge Function cada 5-10 min
DROP FUNCTION IF EXISTS expire_reservations CASCADE;
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count int;
BEGIN
  UPDATE reservations
  SET status = 'no_show'
  WHERE status IN ('confirmed', 'pending')
    AND pickup_date IS NOT NULL
    AND pickup_end_time IS NOT NULL
    AND (pickup_date || ' ' || pickup_end_time)::timestamp < NOW()
    ;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Probar: SELECT expire_reservations();

-- ============================================
-- 6. TRIGGER: actualizar stock al crear reserva
-- ============================================

-- Ya deberÃ­a existir, pero por si acaso:
DROP FUNCTION IF EXISTS update_pack_stock CASCADE;
CREATE OR REPLACE FUNCTION update_pack_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' OR NEW.status = 'no_show' THEN
    -- Devolver stock
    UPDATE packs 
    SET remaining_stock = remaining_stock + NEW.quantity
    WHERE id = NEW.pack_id;
  ELSIF TG_OP = 'INSERT' THEN
    -- Restar stock
    UPDATE packs 
    SET remaining_stock = remaining_stock - NEW.quantity
    WHERE id = NEW.pack_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_pack_stock_trigger ON reservations;
CREATE TRIGGER update_pack_stock_trigger
AFTER INSERT OR UPDATE OF status ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_pack_stock();

-- ============================================
-- 7. TRIGGER: generar cÃ³digo de recogida
-- ============================================

DROP FUNCTION IF EXISTS generate_pickup_code CASCADE;
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.pickup_code := 'P4P-' || 
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3)) || '-' ||
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_pickup_code ON reservations;
CREATE TRIGGER set_pickup_code
BEFORE INSERT ON reservations
FOR EACH ROW
WHEN (NEW.pickup_code IS NULL)
EXECUTE FUNCTION generate_pickup_code();

-- ============================================
-- VERIFICACIÃ“N: listar policies existentes
-- ============================================

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('reservations', 'shops', 'packs', 'user_profiles')
-- ORDER BY tablename, policyname;

-- ============================================
-- BUCKETS DE STORAGE (crear en UI de Supabase)
-- ============================================
-- Crear buckets:
-- 1. shop-images   â†’ pÃºblico
-- 2. pack-images   â†’ pÃºblico
-- 3. avatars       â†’ pÃºblico
-- 
-- Policy para cada bucket:
-- CREATE POLICY "Cualquiera puede leer imÃ¡genes" 
-- ON storage.objects FOR SELECT 
-- USING (bucket_id IN ('shop-images', 'pack-images', 'avatars'));
-- 
-- CREATE POLICY "Usuarios autenticados pueden subir imÃ¡genes"
-- ON storage.objects FOR INSERT
-- WITH CHECK (auth.role() = 'authenticated');

