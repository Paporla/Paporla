-- ============================================
-- MIGRACIN COMPLETA PARA PAPORLA
-- ============================================
-- EJECUTA TODO ESTO EN: Supabase Dashboard  SQL Editor
-- ============================================

-- ============================================
-- 1. TABLA: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'comercio', 'admin', 'super_admin')),
  avatar_url TEXT,
  email_confirmed BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  country TEXT,
  city TEXT
);

-- ============================================
-- 2. TABLA: shops (CON CAMPOS ADICIONALES)
-- ============================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  rating DOUBLE PRECISION DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  country TEXT DEFAULT 'Venezuela',
  category TEXT,
  website TEXT,
  instagram TEXT,
  hours JSONB
);

-- ============================================
-- 3. TABLA: packs (CON status extendido)
-- ============================================
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  original_price_cents INTEGER,
  discount_percentage INTEGER,
  total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
  remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
  pickup_date DATE,
  pickup_start_time TIME,
  pickup_end_time TIME,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'expired')),
  deleted_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLA: reservations (CON TODOS LOS CAMPOS)
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  shop_id UUID NOT NULL REFERENCES shops(id),
  pack_id UUID NOT NULL REFERENCES packs(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  total_price_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready_pickup', 'picked_up', 'expired', 'cancelled', 'refunded', 'no_show')),
  pickup_code TEXT UNIQUE,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('card', 'cash', 'mercado_pago', 'demo')),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  picked_up_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pickup_date DATE,
  pickup_start_time TIME,
  pickup_end_time TIME,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLAS ADICIONALES
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reservation_id UUID REFERENCES reservations(id),
  type TEXT NOT NULL CHECK (type IN ('pickup_reminder', 'cancellation', 'confirmation', 'new_pack', 'shop_verified')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  shop_id UUID NOT NULL REFERENCES shops(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_shop ON favorites(user_id, shop_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. VISTAS
-- ============================================
DROP VIEW IF EXISTS available_packs;
CREATE OR REPLACE VIEW available_packs AS
SELECT 
  p.*,
  s.name AS shop_name,
  s.address AS shop_address,
  s.city AS shop_city,
  s.rating AS shop_rating,
  s.verified AS shop_verified,
  (EXISTS (
    SELECT 1 FROM reservations r 
    WHERE r.pack_id = p.id 
    AND r.user_id = auth.uid() 
    AND r.status IN ('pending', 'confirmed', 'ready_pickup')
  )) AS user_already_reserved
FROM packs p
JOIN shops s ON s.id = p.shop_id
WHERE p.is_active = true 
  AND p.deleted_at IS NULL
  AND s.banned = false
  AND s.deleted_at IS NULL;

-- ============================================
-- 7. FUNCIONES ESENCIALES
-- ============================================

-- Obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'user');
END;
$func$;

-- Generar cdigo de recogida (formato P4P-XXX-XXX)
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $func$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  part1 TEXT := '';
  part2 TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    part1 := part1 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    part2 := part2 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'P4P-' || part1 || '-' || part2;
END;
$func$;

-- Preparar reserva antes de insertar (valida pack y actualiza stock)
CREATE OR REPLACE FUNCTION prepare_reservation_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  pack_record RECORD;
BEGIN
  SELECT * INTO pack_record FROM packs WHERE id = NEW.pack_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack no encontrado';
  END IF;
  
  IF pack_record.remaining_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuficiente: disponible %', pack_record.remaining_stock;
  END IF;
  
  IF pack_record.is_active = false THEN
    RAISE EXCEPTION 'El pack no esta activo';
  END IF;
  
  NEW.pickup_date := COALESCE(NEW.pickup_date, pack_record.pickup_date);
  NEW.pickup_start_time := COALESCE(NEW.pickup_start_time, pack_record.pickup_start_time);
  NEW.pickup_end_time := COALESCE(NEW.pickup_end_time, pack_record.pickup_end_time);
  
  NEW.pickup_code := generate_pickup_code();
  
  IF NEW.payment_method = 'demo' THEN
    NEW.status := 'confirmed';
    NEW.payment_status := 'paid';
  END IF;
  
  UPDATE packs 
  SET remaining_stock = remaining_stock - NEW.quantity
  WHERE id = NEW.pack_id;
  
  UPDATE packs 
  SET status = 'sold_out'
  WHERE id = NEW.pack_id AND remaining_stock <= 0;
  
  RETURN NEW;
END;
$func$;

-- Cancelar reserva (con validacin de 2 horas)
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_reservation_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  res RECORD;
  user_role TEXT;
  hours_before_pickup NUMERIC;
BEGIN
  SELECT * INTO res FROM reservations WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;
  
  SELECT role INTO user_role FROM user_profiles WHERE id = auth.uid();
  
  IF res.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no puede ser cancelada en su estado actual');
  END IF;
  
  IF res.pickup_start_time IS NOT NULL AND res.pickup_date IS NOT NULL AND user_role NOT IN ('admin', 'super_admin') THEN
    hours_before_pickup := EXTRACT(EPOCH FROM (
      (res.pickup_date + res.pickup_start_time) - NOW()
    )) / 3600;
    
    IF hours_before_pickup < 2 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar hasta 2 horas antes de la recogida');
    END IF;
  END IF;
  
  UPDATE reservations SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancel_reason = p_cancel_reason,
    updated_at = NOW()
  WHERE id = p_reservation_id;
  
  UPDATE packs 
  SET remaining_stock = remaining_stock + res.quantity
  WHERE id = res.pack_id;
  
  UPDATE packs
  SET status = 'active'
  WHERE id = res.pack_id AND status = 'sold_out' AND remaining_stock > 0;
  
  RETURN jsonb_build_object('success', true, 'message', 'Reserva cancelada correctamente');
END;
$func$;

-- Expirar reservas viejas (para cron job)
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  expired_count INTEGER := 0;
  affected_rows INTEGER;
BEGIN
  UPDATE reservations
  SET status = 'ready_pickup',
      updated_at = NOW()
  WHERE status = 'confirmed'
    AND pickup_date <= CURRENT_DATE
    AND pickup_start_time <= CURRENT_TIME
    AND pickup_end_time > CURRENT_TIME;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  expired_count := expired_count + affected_rows;
  
  UPDATE reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'ready_pickup'
    AND (pickup_date < CURRENT_DATE 
      OR (pickup_date = CURRENT_DATE AND pickup_end_time <= CURRENT_TIME));
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  expired_count := expired_count + affected_rows;
  
  UPDATE reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  expired_count := expired_count + affected_rows;
  
  UPDATE packs
  SET status = 'expired',
      updated_at = NOW()
  WHERE status IN ('active', 'sold_out')
    AND ends_at IS NOT NULL
    AND ends_at < NOW();
  
  RETURN expired_count;
END;
$func$;

-- Validar recogida (para comercios)
CREATE OR REPLACE FUNCTION validate_pickup(
  p_pickup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  res RECORD;
  pack_record RECORD;
  shop_record RECORD;
BEGIN
  SELECT * INTO res FROM reservations WHERE pickup_code = p_pickup_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Codigo invalido');
  END IF;
  
  SELECT * INTO shop_record FROM shops WHERE id = res.shop_id;
  
  IF shop_record.owner_id != auth.uid() AND get_user_role() NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autorizado para validar esta recogida');
  END IF;
  
  IF res.status != 'ready_pickup' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no esta lista para recoger. Estado: ' || res.status);
  END IF;
  
  IF res.pickup_date IS NOT NULL AND res.pickup_start_time IS NOT NULL AND res.pickup_end_time IS NOT NULL THEN
    IF CURRENT_DATE < res.pickup_date THEN
      RETURN jsonb_build_object('success', false, 'error', 'Aun no es la fecha de recogida');
    END IF;
    IF CURRENT_DATE = res.pickup_date AND CURRENT_TIME < res.pickup_start_time THEN
      RETURN jsonb_build_object('success', false, 'error', 'Aun no es la hora de recogida');
    END IF;
    IF CURRENT_DATE > res.pickup_date OR (CURRENT_DATE = res.pickup_date AND CURRENT_TIME > res.pickup_end_time) THEN
      RETURN jsonb_build_object('success', false, 'error', 'La ventana de recogida ha expirado');
    END IF;
  END IF;
  
  SELECT * INTO pack_record FROM packs WHERE id = res.pack_id;
  
  UPDATE reservations SET
    status = 'picked_up',
    picked_up_at = NOW(),
    updated_at = NOW()
  WHERE id = res.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Recogida validada correctamente',
    'data', jsonb_build_object(
      'userName', (SELECT name FROM user_profiles WHERE id = res.user_id),
      'packTitle', pack_record.title,
      'shopName', shop_record.name
    )
  );
END;
$func$;

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger: Crear perfil automticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  user_name TEXT;
  user_role TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  
  INSERT INTO user_profiles (id, email, name, role, email_confirmed)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_role,
    NEW.email_confirmed_at IS NOT NULL
  );
  
  IF user_role = 'comercio' THEN
    INSERT INTO shops (owner_id, name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'shop_name', user_name || ' Shop')
    );
  END IF;
  
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger: Preparar reserva antes de insertar
DROP TRIGGER IF EXISTS before_reservation_insert ON reservations;
CREATE TRIGGER before_reservation_insert
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION prepare_reservation_before_insert();

-- Trigger: Actualizar updated_at en packs
CREATE OR REPLACE FUNCTION update_pack_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_pack_update ON packs;
CREATE TRIGGER on_pack_update
  BEFORE UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION update_pack_updated_at();

-- Trigger: Actualizar updated_at en reservations
CREATE OR REPLACE FUNCTION update_reservation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_reservation_update ON reservations;
CREATE TRIGGER on_reservation_update
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_updated_at();

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Limpiar polticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;
DROP POLICY IF EXISTS "Owners can manage their shop" ON shops;
DROP POLICY IF EXISTS "Admins can manage shops" ON shops;
DROP POLICY IF EXISTS "Anyone can view active packs" ON packs;
DROP POLICY IF EXISTS "Shop owners can manage packs" ON packs;
DROP POLICY IF EXISTS "Admins can manage packs" ON packs;
DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON reservations;
DROP POLICY IF EXISTS "Users can cancel own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Shop owners can view reservations" ON reservations;
DROP POLICY IF EXISTS "Shop owners can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admins can manage all reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;

-- user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (get_user_role() IN ('admin', 'super_admin'));

-- shops
CREATE POLICY "Anyone can view active shops"
  ON shops FOR SELECT
  USING (deleted_at IS NULL AND banned = false);

CREATE POLICY "Owners can manage their shop"
  ON shops FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage shops"
  ON shops FOR ALL
  USING (get_user_role() IN ('admin', 'super_admin'));

-- packs
CREATE POLICY "Anyone can view active packs"
  ON packs FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Shop owners can manage packs"
  ON packs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = packs.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage packs"
  ON packs FOR ALL
  USING (get_user_role() IN ('admin', 'super_admin'));

-- reservations
CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (status = 'cancelled')
  );

CREATE POLICY "Shop owners can view reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = reservations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can update reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = reservations.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reservations"
  ON reservations FOR ALL
  USING (get_user_role() IN ('admin', 'super_admin'));

-- notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- favorites
CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- 10. STORAGE BUCKETS
-- ============================================

-- Crear buckets de storage (descomentar si se necesita ejecutar desde SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shop-images', 'shop-images', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pack-images', 'pack-images', true) ON CONFLICT DO NOTHING;

-- Polticas para storage
-- CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
-- CREATE POLICY "Anyone can view shop images" ON storage.objects FOR SELECT USING (bucket_id = 'shop-images');
-- CREATE POLICY "Shop owners can upload shop images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "Anyone can view pack images" ON storage.objects FOR SELECT USING (bucket_id = 'pack-images');
-- CREATE POLICY "Shop owners can upload pack images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pack-images' AND auth.role() = 'authenticated');

-- ============================================
-- 11. ACTUALIZACIONES PARA DATOS EXISTENTES
-- ============================================

-- Actualizar usuarios existentes a admin (si existen)
UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@paporla.com';
UPDATE user_profiles SET role = 'super_admin' WHERE email = 'super@paporla.com';

