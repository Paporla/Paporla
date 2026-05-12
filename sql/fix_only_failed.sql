-- ============================================
-- SOLO LAS PARTES QUE FALLARON
-- ============================================

-- 1. VISTA available_packs
CREATE OR REPLACE VIEW available_packs AS
SELECT 
  p.*,
  s.name AS shop_name,
  s.address AS shop_address,
  s.city AS shop_city,
  s.rating AS shop_rating,
  s.verified AS shop_verified
FROM packs p
JOIN shops s ON s.id = p.shop_id
WHERE p.is_active = true 
  AND p.remaining_stock > 0 
  AND p.deleted_at IS NULL
  AND s.banned = false
  AND s.deleted_at IS NULL;

-- 2. FUNCIÓN decrement_pack_stock
CREATE OR REPLACE FUNCTION decrement_pack_stock(pack_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE packs
  SET remaining_stock = remaining_stock - 1
  WHERE id = pack_id_param AND remaining_stock > 0;
END;
$$;

-- 3. FUNCIÓN generate_pickup_code
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'P4P-' || substr(code, 1, 4) || '-' || substr(code, 5, 4);
END;
$$;

-- 4. FUNCIÓN handle_new_user (trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, name, role, email_confirmed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$;

-- 5. TRIGGER: Crear perfil al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. FUNCIÓN set_pickup_code
CREATE OR REPLACE FUNCTION set_pickup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reservations 
  SET pickup_code = generate_pickup_code()
  WHERE id = NEW.id AND pickup_code IS NULL;
  RETURN NEW;
END;
$$;

-- 7. TRIGGER: Código de recogida automático
DROP TRIGGER IF EXISTS on_reservation_created ON reservations;
CREATE TRIGGER on_reservation_created
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_pickup_code();

-- 8. FUNCIÓN update_pack_stock_on_reservation
CREATE OR REPLACE FUNCTION update_pack_stock_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('pending', 'confirmed') THEN
    UPDATE packs
    SET remaining_stock = remaining_stock - NEW.quantity
    WHERE id = NEW.pack_id AND remaining_stock >= NEW.quantity;
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE packs
    SET remaining_stock = remaining_stock + NEW.quantity
    WHERE id = NEW.pack_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. TRIGGER: Stock automático
DROP TRIGGER IF EXISTS on_reservation_status_change ON reservations;
CREATE TRIGGER on_reservation_status_change
  AFTER INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_pack_stock_on_reservation();

-- 10. RLS POLICIES
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;
CREATE POLICY "Anyone can view active shops"
  ON shops FOR SELECT
  USING (deleted_at IS NULL AND banned = false);

DROP POLICY IF EXISTS "Owners can manage their shop" ON shops;
CREATE POLICY "Owners can manage their shop"
  ON shops FOR ALL
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone can view active packs" ON packs;
CREATE POLICY "Anyone can view active packs"
  ON packs FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Shop owners can manage packs" ON packs;
CREATE POLICY "Shop owners can manage packs"
  ON packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = packs.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel own reservations" ON reservations;
CREATE POLICY "Users can cancel own reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'cancelled'  -- ← CORREGIDO: sin NEW.
  );

DROP POLICY IF EXISTS "Shop owners can view reservations" ON reservations;
CREATE POLICY "Shop owners can view reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = reservations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Shop owners can confirm reservations" ON reservations;
CREATE POLICY "Shop owners can confirm reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = reservations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );
