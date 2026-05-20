-- ========================================================
-- RECONSTRUCCIÓN COMPLETA DE BASE DE DATOS (PAPORLA)
-- ========================================================
-- Este script recrea el esquema 'public' de Supabase
-- PRESERVANDO las cuentas y perfiles de usuario existentes.
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Limpieza de tablas existentes (evitando tocar user_profiles si ya existe)
DROP VIEW IF EXISTS public.available_packs CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.packs CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;

-- 2. Creación / Sincronización de user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
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

-- 3. Tabla: shops (Comercios)
CREATE TABLE public.shops (
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

-- 4. Tabla: packs (Bolsas sorpresa de excedente de comida)
CREATE TABLE public.packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  original_price_cents INTEGER,
  discount_percentage INTEGER,
  total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
  remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
  pickup_date DATE NOT NULL,
  pickup_start_time TIME NOT NULL,
  pickup_end_time TIME NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ NOT NULL, -- Fecha y hora límite para recoger
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'expired')),
  deleted_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla: reservations (Reservas realizadas por los clientes)
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  total_price_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'picked_up', 'cancelled', 'no_show')),
  pickup_code TEXT UNIQUE,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_method TEXT DEFAULT 'demo' CHECK (payment_method IN ('card', 'cash', 'mercado_pago', 'demo')),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  picked_up_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  pickup_date DATE,
  pickup_start_time TIME,
  pickup_end_time TIME,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tablas secundarias: favorites, notifications, activity_logs
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_favorites_user_shop ON public.favorites(user_id, shop_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('pickup_reminder', 'cancellation', 'confirmation', 'new_pack', 'shop_verified')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- VISTAS COMPATIBLES CON FILTRADOS EN POSTGREST (Next.js)
-- ========================================================
CREATE OR REPLACE VIEW public.available_packs AS
SELECT 
  p.*,
  s.name AS shop_name,
  s.address AS shop_address,
  s.city AS shop_city,
  s.rating AS shop_rating,
  s.verified AS shop_verified,
  s.logo_url AS shop_logo_url,
  (EXISTS (
    SELECT 1 FROM public.reservations r 
    WHERE r.pack_id = p.id 
    AND r.user_id = auth.uid() 
    AND r.status IN ('pending', 'confirmed')
  )) AS user_already_reserved
FROM public.packs p
JOIN public.shops s ON s.id = p.shop_id
WHERE p.is_active = true 
  AND p.deleted_at IS NULL
  AND p.remaining_stock > 0
  AND p.ends_at > NOW()
  AND s.banned = false
  AND s.deleted_at IS NULL;

-- ========================================================
-- FUNCIONES AUXILIARES Y TRIGGERS DE CONTROL
-- ========================================================

-- 1. Rol de usuario activo
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- 2. Autogeneración de código de recogida corto
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;

-- 3. Calcular la fecha final 'ends_at' antes de insertar o modificar un pack
CREATE OR REPLACE FUNCTION public.calculate_pack_ends_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ends_at := (NEW.pickup_date + NEW.pickup_end_time)::timestamp with time zone;
  -- Calcular descuento automáticamente si hay precio original
  IF NEW.original_price_cents IS NOT NULL AND NEW.original_price_cents > 0 THEN
    NEW.discount_percentage := ROUND((1.0 - (NEW.price_cents::numeric / NEW.original_price_cents::numeric)) * 100);
  ELSE
    NEW.discount_percentage := 0;
  END IF;
  
  -- Ajustar status del pack en base al stock
  IF NEW.remaining_stock <= 0 THEN
    NEW.status := 'sold_out';
  ELSE
    NEW.status := 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pack_before_save
  BEFORE INSERT OR UPDATE ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_pack_ends_at();

-- 4. Creación automática de perfiles para nuevos usuarios registrados en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
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
-- PROCESAMIENTO ATÓMICO DE RESERVAS (RPC)
-- ========================================================
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_pack_id UUID,
  p_quantity INTEGER,
  p_payment_method TEXT DEFAULT 'demo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack RECORD;
  v_shop RECORD;
  v_reservation_id UUID;
  v_pickup_code TEXT;
  v_total_price INTEGER;
BEGIN
  -- 1. Bloquear fila del pack para evitar problemas de concurrencia
  SELECT * INTO v_pack FROM public.packs WHERE id = p_pack_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El pack no existe.');
  END IF;
  
  IF NOT v_pack.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este pack ya no está activo.');
  END IF;
  
  IF v_pack.ends_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'El horario de recogida de este pack ya finalizó.');
  END IF;
  
  IF v_pack.remaining_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'No queda stock suficiente. Disponibles: ' || v_pack.remaining_stock);
  END IF;

  -- 2. Validar que el cliente no tenga ya una reserva activa para este mismo pack
  IF EXISTS (
    SELECT 1 FROM public.reservations 
    WHERE user_id = auth.uid() 
      AND pack_id = p_pack_id 
      AND status IN ('pending', 'confirmed')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya tienes una reserva activa para este pack.');
  END IF;

  -- 3. Generar código y calcular total
  v_pickup_code := public.generate_pickup_code();
  v_total_price := v_pack.price_cents * p_quantity;

  -- 4. Insertar reserva
  INSERT INTO public.reservations (
    user_id,
    shop_id,
    pack_id,
    quantity,
    total_price_cents,
    status,
    pickup_code,
    payment_method,
    payment_status,
    pickup_date,
    pickup_start_time,
    pickup_end_time
  ) VALUES (
    auth.uid(),
    v_pack.shop_id,
    p_pack_id,
    p_quantity,
    v_total_price,
    'confirmed', -- Para efectivo/demo se auto-confirma
    v_pickup_code,
    p_payment_method,
    CASE WHEN p_payment_method IN ('demo', 'card', 'mercado_pago') THEN 'paid' ELSE 'pending' END,
    v_pack.pickup_date,
    v_pack.pickup_start_time,
    v_pack.pickup_end_time
  )
  RETURNING id INTO v_reservation_id;

  -- 5. Decrementar stock del pack
  UPDATE public.packs 
  SET remaining_stock = remaining_stock - p_quantity
  WHERE id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true, 
    'reservation_id', v_reservation_id, 
    'pickup_code', v_pickup_code
  );
END;
$$;

-- ========================================================
-- CANCELACIÓN DE RESERVAS (RPC)
-- ========================================================
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res RECORD;
  v_role TEXT;
  v_hours_before_pickup NUMERIC;
BEGIN
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada.');
  END IF;
  
  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede cancelar en su estado actual.');
  END IF;
  
  -- Verificar límite de tiempo de 2 horas (solo aplica para clientes comunes)
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role = 'user' AND v_res.pickup_date IS NOT NULL AND v_res.pickup_start_time IS NOT NULL THEN
    v_hours_before_pickup := EXTRACT(EPOCH FROM ((v_res.pickup_date + v_res.pickup_start_time) - NOW())) / 3600;
    IF v_hours_before_pickup < 2 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar tu reserva hasta 2 horas antes de la recogida.');
    END IF;
  END IF;

  -- Actualizar estado a cancelado
  UPDATE public.reservations 
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancel_reason = p_cancel_reason,
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Devolver el stock al pack
  UPDATE public.packs 
  SET remaining_stock = remaining_stock + v_res.quantity
  WHERE id = v_res.pack_id;

  RETURN jsonb_build_object('success', true, 'message', 'Reserva cancelada exitosamente.');
END;
$$;

-- ========================================================
-- VALIDACIÓN DE RECOGIDA POR PARTE DEL COMERCIO (RPC)
-- ========================================================
CREATE OR REPLACE FUNCTION public.validate_pickup(
  p_pickup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res RECORD;
  v_shop RECORD;
BEGIN
  -- Buscar reserva por código
  SELECT r.*, p.title AS pack_title INTO v_res 
  FROM public.reservations r
  JOIN public.packs p ON p.id = r.pack_id
  WHERE r.pickup_code = p_pickup_code;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de recogida inválido.');
  END IF;
  
  -- Validar autorización: Solo el dueño del comercio o un administrador pueden validar
  SELECT * INTO v_shop FROM public.shops WHERE id = v_res.shop_id;
  IF v_shop.owner_id != auth.uid() AND public.get_user_role() NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No estás autorizado para validar recogidas en este comercio.');
  END IF;
  
  IF v_res.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede recoger. Estado actual: ' || v_res.status);
  END IF;

  -- Validar que estemos en la fecha/hora
  IF NOW() < (v_res.pickup_date + v_res.pickup_start_time)::timestamp with time zone - INTERVAL '15 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Todavía no ha comenzado la hora de recogida.');
  END IF;
  
  IF NOW() > (v_res.pickup_date + v_res.pickup_end_time)::timestamp with time zone + INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El horario de recogida ya finalizó (exceso de tolerancia).');
  END IF;

  -- Confirmar recogida exitosa
  UPDATE public.reservations 
  SET status = 'picked_up',
      picked_up_at = NOW(),
      updated_at = NOW()
  WHERE id = v_res.id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Código validado. Entrega el pack al cliente.',
    'pack_title', v_res.pack_title,
    'quantity', v_res.quantity
  );
END;
$$;

-- ========================================================
-- EXPIRACIÓN AUTOMÁTICA DE RESERVAS Y PACKS (Para Cron Job)
-- ========================================================
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_res_count INTEGER := 0;
  v_expired_packs_count INTEGER := 0;
BEGIN
  -- 1. Marcar reservas confirmadas no retiradas como 'no_show'
  UPDATE public.reservations
  SET status = 'no_show',
      updated_at = NOW()
  WHERE status = 'confirmed'
    AND (pickup_date + pickup_end_time)::timestamp with time zone < NOW();
  
  GET DIAGNOSTICS v_expired_res_count = ROW_COUNT;

  -- 2. Desactivar packs cuya ventana de recogida ya finalizó
  UPDATE public.packs
  SET is_active = false,
      status = 'expired',
      updated_at = NOW()
  WHERE is_active = true
    AND ends_at < NOW();
    
  GET DIAGNOSTICS v_expired_packs_count = ROW_COUNT;

  -- 3. Desactivar packs sin stock
  UPDATE public.packs
  SET is_active = false,
      status = 'sold_out',
      updated_at = NOW()
  WHERE is_active = true
    AND remaining_stock <= 0;

  RETURN v_expired_res_count;
END;
$$;

-- ========================================================
-- POLÍTICAS DE SEGURIDAD RLS (Row Level Security)
-- ========================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de user_profiles
CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user_profiles_admin_all" ON public.user_profiles FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 2. Políticas de shops
CREATE POLICY "shops_select_public" ON public.shops FOR SELECT USING (deleted_at IS NULL AND banned = false);
CREATE POLICY "shops_owner_manage" ON public.shops FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "shops_admin_all" ON public.shops FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 3. Políticas de packs
CREATE POLICY "packs_select_public" ON public.packs FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "packs_owner_manage" ON public.packs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id = packs.shop_id AND owner_id = auth.uid()
  )
);
CREATE POLICY "packs_admin_all" ON public.packs FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 4. Políticas de reservations
CREATE POLICY "reservations_select_client" ON public.reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reservations_select_merchant" ON public.reservations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE id = reservations.shop_id AND owner_id = auth.uid()
  )
);
CREATE POLICY "reservations_client_insert" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reservations_client_update" ON public.reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reservations_admin_all" ON public.reservations FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 5. Políticas de favorites
CREATE POLICY "favorites_client_all" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- 6. Políticas de notifications
CREATE POLICY "notifications_client_all" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 7. Políticas de activity_logs
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_logs_admin_all" ON public.activity_logs FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ========================================================
-- SINCRONIZACIÓN DE USUARIOS EXISTENTES DE AUTH
-- ========================================================
INSERT INTO public.user_profiles (id, email, name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
  'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
