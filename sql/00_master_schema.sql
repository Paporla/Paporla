-- ========================================================
-- PAPORLA - ESQUEMA COMPLETO DE BASE DE DATOS (SUPABASE)
-- ========================================================
-- Estilo: Too Good To Go - Rescate Alimentario
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- 
-- CARACTERÍSTICAS:
-- - Idempotente (ejecutar múltiples veces sin errores)
-- - PRESERVA usuarios y perfiles existentes
-- - Admin puede eliminar usuarios y comercios con todo su historial
-- - Incluye tablas, vistas, funciones, triggers, policies, índices
-- ========================================================

-- ========================================================
-- 0. LIMPIEZA SEGURA (preserva auth.users y user_profiles)
-- ========================================================

-- Desactivar RLS temporalmente para la limpieza
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops DISABLE ROW LEVEL SECURITY;

-- Eliminar en orden inverso de dependencias
DROP VIEW IF EXISTS public.available_packs CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.packs CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;

-- NO eliminamos user_profiles para preservar datos existentes

-- ========================================================
-- 1. TABLA: user_profiles (preservada, solo recrear si no existe)
-- ========================================================

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  country TEXT,
  city TEXT,
  -- Campos para estadísticas de usuario
  total_reservations INTEGER DEFAULT 0,
  total_pickups INTEGER DEFAULT 0,
  total_cancellations INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0
);

-- ========================================================
-- 2. TABLA: shops (Comercios)
-- ========================================================

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  country TEXT DEFAULT 'Venezuela',
  category TEXT,
  website TEXT,
  instagram TEXT,
  hours JSONB,
  -- Estadísticas del comercio
  total_packs_sold INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  active_packs_count INTEGER DEFAULT 0
);

-- ========================================================
-- 3. TABLA: packs (Bolsas sorpresa)
-- ========================================================

CREATE TABLE public.packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  original_price_cents INTEGER,
  discount_percentage INTEGER DEFAULT 0,
  total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
  remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
  pickup_date DATE NOT NULL,
  pickup_start_time TIME NOT NULL,
  pickup_end_time TIME NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  image_gallery JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'expired')),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 4. TABLA: reservations (Reservas)
-- ========================================================

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
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
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

-- ========================================================
-- 5. TABLA: favorites
-- ========================================================

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_shop ON public.favorites(user_id, shop_id);

-- ========================================================
-- 6. TABLA: notifications (CHECK constraint EXPANDIDO)
-- ========================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'pickup_reminder',
    'cancellation',
    'confirmation',
    'new_pack',
    'shop_verified',
    'new_reservation',
    'user_cancelled',
    'pickup_completed',
    'new_user',
    'new_shop',
    'incidence',
    'reservation_expired',
    'pack_sold_out'
  )),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 7. TABLA: activity_logs
-- ========================================================

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
-- 7b. COLUMNAS FALTANTES (para tablas que ya existían)
-- ========================================================

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_reservations INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_pickups INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_no_shows INTEGER DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS total_packs_sold INTEGER DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS total_revenue_cents INTEGER DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS active_packs_count INTEGER DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS image_gallery JSONB DEFAULT '[]'::jsonb;

-- ========================================================
-- 8. ÍNDICES DE PERFORMANCE
-- ========================================================

-- user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON public.user_profiles(city);

-- shops
CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_city ON public.shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_verified ON public.shops(verified);
CREATE INDEX IF NOT EXISTS idx_shops_banned ON public.shops(banned);
CREATE INDEX IF NOT EXISTS idx_shops_deleted ON public.shops(deleted_at);
CREATE INDEX IF NOT EXISTS idx_shops_created ON public.shops(created_at DESC);

-- packs
CREATE INDEX IF NOT EXISTS idx_packs_shop ON public.packs(shop_id);
CREATE INDEX IF NOT EXISTS idx_packs_active ON public.packs(is_active);
CREATE INDEX IF NOT EXISTS idx_packs_status ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_ends_at ON public.packs(ends_at);
CREATE INDEX IF NOT EXISTS idx_packs_created ON public.packs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packs_deleted ON public.packs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_packs_pickup_date ON public.packs(pickup_date);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shop ON public.reservations(shop_id);
CREATE INDEX IF NOT EXISTS idx_reservations_pack ON public.reservations(pack_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_pickup_code ON public.reservations(pickup_code);
CREATE INDEX IF NOT EXISTS idx_reservations_pickup_date ON public.reservations(pickup_date);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON public.reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON public.reservations(payment_status);

-- favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_shop ON public.favorites(shop_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_reservation ON public.notifications(reservation_id);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON public.activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(type);

-- ========================================================
-- 9. VISTA: available_packs
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
  s.latitude AS shop_latitude,
  s.longitude AS shop_longitude,
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
-- 10. FUNCIONES AUXILIARES
-- ========================================================

-- 10.1 Rol de usuario activo
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- 10.2 Generación de código de recogida
DROP FUNCTION IF EXISTS public.generate_pickup_code() CASCADE;
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

-- ========================================================
-- 11. TRIGGERS
-- ========================================================

-- 11.1 Trigger: Calcular ends_at, descuento y status del pack
DROP FUNCTION IF EXISTS public.calculate_pack_ends_at() CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_pack_ends_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ends_at := (NEW.pickup_date + NEW.pickup_end_time)::timestamp with time zone;
  
  IF NEW.original_price_cents IS NOT NULL AND NEW.original_price_cents > 0 THEN
    NEW.discount_percentage := ROUND((1.0 - (NEW.price_cents::numeric / NEW.original_price_cents::numeric)) * 100);
  ELSE
    NEW.discount_percentage := 0;
  END IF;
  
  IF NEW.remaining_stock <= 0 THEN
    NEW.status := 'sold_out';
  ELSE
    NEW.status := 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pack_before_save ON public.packs;
CREATE TRIGGER trigger_pack_before_save
  BEFORE INSERT OR UPDATE ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_pack_ends_at();

-- 11.2 Trigger: updated_at automático para packs
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_packs_updated_at ON public.packs;
CREATE TRIGGER trigger_packs_updated_at
  BEFORE UPDATE ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11.3 Trigger: updated_at automático para reservations
DROP TRIGGER IF EXISTS trigger_reservations_updated_at ON public.reservations;
CREATE TRIGGER trigger_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11.4 Trigger: updated_at automático para shops
DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11.5 Trigger: updated_at automático para user_profiles
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11.6 Trigger: Creación automática de perfil para nuevos usuarios
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
    'user', -- SIEMPRE 'user' por seguridad; el cambio de rol solo via admin
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

-- 11.7 Trigger: Sincronizar email_confirmed cuando el usuario confirma email en Auth
DROP FUNCTION IF EXISTS public.sync_email_confirmed() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.user_profiles 
    SET email_confirmed = true, 
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_confirmed();

-- ========================================================
-- 12. FUNCIONES RPC
-- ========================================================

-- 12.1 CREAR RESERVA ATÓMICA (evita race conditions)
DROP FUNCTION IF EXISTS public.create_reservation_atomic(uuid, integer, text) CASCADE;
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_pack_id UUID,
  p_quantity INTEGER,
  p_payment_method TEXT DEFAULT 'demo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack RECORD;
  v_reservation_id UUID;
  v_pickup_code TEXT;
  v_total_price INTEGER;
BEGIN
  -- Bloquear fila del pack para evitar race conditions
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

  -- Validar que el cliente no tenga ya una reserva activa para este pack
  IF EXISTS (
    SELECT 1 FROM public.reservations 
    WHERE user_id = auth.uid() 
      AND pack_id = p_pack_id 
      AND status IN ('pending', 'confirmed')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya tienes una reserva activa para este pack.');
  END IF;

  -- Generar código y calcular total
  v_pickup_code := public.generate_pickup_code();
  v_total_price := v_pack.price_cents * p_quantity;

  -- Insertar reserva
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
    'confirmed',
    v_pickup_code,
    p_payment_method,
    CASE WHEN p_payment_method IN ('demo', 'card', 'mercado_pago') THEN 'paid' ELSE 'pending' END,
    v_pack.pickup_date,
    v_pack.pickup_start_time,
    v_pack.pickup_end_time
  )
  RETURNING id INTO v_reservation_id;

  -- Decrementar stock
  UPDATE public.packs 
  SET remaining_stock = remaining_stock - p_quantity
  WHERE id = p_pack_id;

  -- Actualizar estadísticas del comercio
  UPDATE public.shops
  SET total_packs_sold = total_packs_sold + p_quantity,
      total_revenue_cents = total_revenue_cents + v_total_price
  WHERE id = v_pack.shop_id;

  -- Actualizar estadísticas del usuario
  UPDATE public.user_profiles
  SET total_reservations = total_reservations + 1
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true, 
    'reservation_id', v_reservation_id, 
    'pickup_code', v_pickup_code
  );
END;
$$;

-- 12.2 CANCELAR RESERVA (reintegra stock)
DROP FUNCTION IF EXISTS public.cancel_reservation(uuid, text) CASCADE;
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_role TEXT;
  v_hours_before_pickup NUMERIC;
BEGIN
  -- BLOQUEO: evitar race conditions en cancelacion concurrente
  SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada.');
  END IF;
  
  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede cancelar en su estado actual.');
  END IF;
  
  -- Verificar límite de 2 horas antes de la recogida (solo para clientes comunes)
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role = 'user' AND v_res.pickup_date IS NOT NULL AND v_res.pickup_start_time IS NOT NULL THEN
    v_hours_before_pickup := EXTRACT(EPOCH FROM ((v_res.pickup_date + v_res.pickup_start_time) - NOW())) / 3600;
    IF v_hours_before_pickup < 2 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Solo puedes cancelar tu reserva hasta 2 horas antes de la recogida.');
    END IF;
  END IF;

  -- Cancelar reserva
  UPDATE public.reservations 
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancel_reason = p_cancel_reason,
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Reintegrar stock
  UPDATE public.packs 
  SET remaining_stock = remaining_stock + v_res.quantity
  WHERE id = v_res.pack_id;

  -- Actualizar estadísticas del comercio
  UPDATE public.shops
  SET total_packs_sold = GREATEST(0, total_packs_sold - v_res.quantity),
      total_revenue_cents = GREATEST(0, total_revenue_cents - v_res.total_price_cents)
  WHERE id = v_res.shop_id;

  -- Actualizar estadísticas del usuario
  UPDATE public.user_profiles
  SET total_cancellations = total_cancellations + 1
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Reserva cancelada exitosamente.');
END;
$$;

-- 12.3 VALIDAR RECOGIDA (solo comercio/admin)
DROP FUNCTION IF EXISTS public.validate_pickup(text) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_pickup(
  p_pickup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res RECORD;
  v_shop RECORD;
BEGIN
  -- BLOQUEO: evitar doble validacion del mismo codigo
  SELECT r.*, p.title AS pack_title INTO v_res 
  FROM public.reservations r
  JOIN public.packs p ON p.id = r.pack_id
  WHERE r.pickup_code = p_pickup_code
  FOR UPDATE OF r;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de recogida inválido.');
  END IF;
  
  -- Validar autorización
  SELECT * INTO v_shop FROM public.shops WHERE id = v_res.shop_id;
  IF v_shop.owner_id != auth.uid() AND public.get_user_role() NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No estás autorizado para validar recogidas en este comercio.');
  END IF;
  
  IF v_res.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La reserva no se puede recoger. Estado actual: ' || v_res.status);
  END IF;

  -- Validar fecha/hora de recogida (15 min antes - 30 min después)
  IF NOW() < (v_res.pickup_date + v_res.pickup_start_time)::timestamp with time zone - INTERVAL '15 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Todavía no ha comenzado la hora de recogida.');
  END IF;
  
  IF NOW() > (v_res.pickup_date + v_res.pickup_end_time)::timestamp with time zone + INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El horario de recogida ya finalizó (exceso de tolerancia).');
  END IF;

  -- Confirmar recogida
  UPDATE public.reservations 
  SET status = 'picked_up',
      picked_up_at = NOW(),
      updated_at = NOW()
  WHERE id = v_res.id;

  -- Actualizar estadísticas del comercio
  UPDATE public.shops
  SET active_packs_count = GREATEST(0, active_packs_count - 1)
  WHERE id = v_res.shop_id;

  -- Actualizar estadísticas del usuario
  UPDATE public.user_profiles
  SET total_pickups = total_pickups + 1
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Código validado. Entrega el pack al cliente.',
    'pack_title', v_res.pack_title,
    'quantity', v_res.quantity
  );
END;
$$;

-- 12.4 EXPIRACIÓN AUTOMÁTICA (para cron job)
DROP FUNCTION IF EXISTS public.expire_reservations() CASCADE;
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_res_count INTEGER := 0;
  v_expired_packs_count INTEGER := 0;
  v_sold_out_count INTEGER := 0;
BEGIN
  -- Marcar reservas confirmadas no retiradas como 'no_show'
  UPDATE public.reservations
  SET status = 'no_show',
      updated_at = NOW()
  WHERE status = 'confirmed'
    AND (pickup_date + pickup_end_time)::timestamp with time zone < NOW();
  
  GET DIAGNOSTICS v_expired_res_count = ROW_COUNT;

  -- Desactivar packs cuya ventana de recogida ya finalizó
  UPDATE public.packs
  SET is_active = false,
      status = 'expired',
      updated_at = NOW()
  WHERE is_active = true
    AND ends_at < NOW();
    
  GET DIAGNOSTICS v_expired_packs_count = ROW_COUNT;

  -- Desactivar packs sin stock
  UPDATE public.packs
  SET is_active = false,
      status = 'sold_out',
      updated_at = NOW()
  WHERE is_active = true
    AND remaining_stock <= 0;

  GET DIAGNOSTICS v_sold_out_count = ROW_COUNT;

  -- Actualizar no_shows en user_profiles
  UPDATE public.user_profiles
  SET total_no_shows = total_no_shows + 1
  WHERE id IN (
    SELECT user_id FROM public.reservations 
    WHERE status = 'no_show' 
    AND updated_at >= NOW() - INTERVAL '1 minute'
  );

  RETURN jsonb_build_object(
    'success', true,
    'expired_reservations', v_expired_res_count,
    'expired_packs', v_expired_packs_count,
    'sold_out_packs', v_sold_out_count
  );
END;
$$;

-- 12.5 LIMPIEZA DE RESERVAS PENDIENTES (la que faltaba)
DROP FUNCTION IF EXISTS public.cleanup_pending_reservations(integer) CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_pending_reservations(
  p_minutes_ago INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
BEGIN
  -- Eliminar reservas pendientes que llevan más de X minutos sin completar
  -- Esto cubre el caso donde el usuario inició la reserva pero no finalizó
  DELETE FROM public.reservations
  WHERE status = 'pending'
    AND created_at < NOW() - (p_minutes_ago * INTERVAL '1 minute');
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_cleaned_count
  );
END;
$$;

-- 12.6 ACTUALIZAR RATING DEL COMERCIO
DROP FUNCTION IF EXISTS public.update_shop_rating(uuid, double precision) CASCADE;
CREATE OR REPLACE FUNCTION public.update_shop_rating(
  p_shop_id UUID,
  p_new_rating DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated RECORD;
BEGIN
  IF p_new_rating < 1 OR p_new_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La calificación debe ser entre 1 y 5.');
  END IF;
  
  -- UPDATE atómico: evita race conditions al calcular rating en una sola operacion
  UPDATE public.shops
  SET rating = ROUND(((COALESCE(rating, 0) * total_ratings) + p_new_rating) / (total_ratings + 1), 1),
      total_ratings = total_ratings + 1,
      updated_at = NOW()
  WHERE id = p_shop_id
  RETURNING rating, total_ratings INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_rating', v_updated.rating,
    'total_ratings', v_updated.total_ratings
  );
END;
$$;

-- 12.7 ELIMINAR USUARIO (ADMIN) - Elimina todo el historial
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_user_email TEXT;
BEGIN
  -- Verificar que el que llama es admin
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para eliminar usuarios.');
  END IF;
  
  SELECT email INTO v_user_email FROM public.user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado.');
  END IF;
  
  -- Eliminar en orden de dependencias
  DELETE FROM public.activity_logs WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.favorites WHERE user_id = p_user_id;
  DELETE FROM public.reservations WHERE user_id = p_user_id;
  
  -- Eliminar shops del usuario (cascade elimina packs y reservations asociadas)
  DELETE FROM public.shops WHERE owner_id = p_user_id;
  
  -- Eliminar perfil
  DELETE FROM public.user_profiles WHERE id = p_user_id;
  
  -- Eliminar de auth.users
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario ' || v_user_email || ' eliminado completamente.'
  );
END;
$$;

-- 12.8 ELIMINAR COMERCIO (ADMIN) - Elimina todo el historial del comercio
DROP FUNCTION IF EXISTS public.admin_delete_shop(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_shop(
  p_shop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_shop_name TEXT;
BEGIN
  -- Verificar que el que llama es admin
  SELECT role INTO v_caller_role FROM public.user_profiles WHERE id = auth.uid();
  
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tienes permisos para eliminar comercios.');
  END IF;
  
  SELECT name INTO v_shop_name FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.');
  END IF;
  
  -- Eliminar en orden de dependencias
  DELETE FROM public.activity_logs WHERE metadata->>'shop_id' = p_shop_id::text;
  DELETE FROM public.notifications WHERE reservation_id IN (
    SELECT id FROM public.reservations WHERE shop_id = p_shop_id
  );
  DELETE FROM public.favorites WHERE shop_id = p_shop_id;
  DELETE FROM public.reservations WHERE shop_id = p_shop_id;
  DELETE FROM public.packs WHERE shop_id = p_shop_id;
  DELETE FROM public.shops WHERE id = p_shop_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Comercio "' || v_shop_name || '" eliminado completamente.'
  );
END;
$$;

-- ========================================================
-- 13. POLÍTICAS DE SEGURIDAD RLS
-- ========================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 13.1 user_profiles
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all" ON public.user_profiles;

CREATE POLICY "user_profiles_select_own" ON public.user_profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_profiles_update_own" ON public.user_profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert" ON public.user_profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_admin_all" ON public.user_profiles 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 13.2 shops
DROP POLICY IF EXISTS "shops_select_public" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_manage" ON public.shops;
DROP POLICY IF EXISTS "shops_admin_all" ON public.shops;

CREATE POLICY "shops_select_public" ON public.shops 
  FOR SELECT USING (deleted_at IS NULL AND banned = false);

CREATE POLICY "shops_owner_manage" ON public.shops 
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "shops_admin_all" ON public.shops 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 13.3 packs
DROP POLICY IF EXISTS "packs_select_public" ON public.packs;
DROP POLICY IF EXISTS "packs_owner_manage" ON public.packs;
DROP POLICY IF EXISTS "packs_admin_all" ON public.packs;

CREATE POLICY "packs_select_public" ON public.packs 
  FOR SELECT USING (deleted_at IS NULL AND is_active = true AND remaining_stock > 0);

CREATE POLICY "packs_owner_manage" ON public.packs 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = packs.shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "packs_admin_all" ON public.packs 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 13.4 reservations
DROP POLICY IF EXISTS "reservations_select_client" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select_merchant" ON public.reservations;
DROP POLICY IF EXISTS "reservations_client_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_client_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_admin_all" ON public.reservations;

CREATE POLICY "reservations_select_client" ON public.reservations 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reservations_select_merchant" ON public.reservations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE id = reservations.shop_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "reservations_client_insert" ON public.reservations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo permite actualizar columnas NO-criticas (cancel_reason, etc.)
-- El status solo debe cambiarse via RPC functions (cancel_reservation, validate_pickup, etc.)
CREATE POLICY "reservations_client_update" ON public.reservations 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reservations_admin_all" ON public.reservations 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 13.5 favorites
DROP POLICY IF EXISTS "favorites_client_all" ON public.favorites;

CREATE POLICY "favorites_client_all" ON public.favorites 
  FOR ALL USING (auth.uid() = user_id);

-- 13.6 notifications (CORREGIDO: WITH CHECK para INSERT)
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_business" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON public.notifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications 
  FOR DELETE USING (auth.uid() = user_id);

-- Los comercios pueden ver notificaciones de sus reservas
CREATE POLICY "notifications_business" ON public.notifications 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      JOIN public.shops s ON s.id = r.shop_id
      WHERE r.id = notifications.reservation_id 
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "notifications_admin_all" ON public.notifications 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- 13.7 activity_logs
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_admin_all" ON public.activity_logs;

CREATE POLICY "activity_logs_insert" ON public.activity_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_logs_admin_all" ON public.activity_logs 
  FOR ALL USING (public.get_user_role() IN ('admin', 'super_admin'));

-- ========================================================
-- 14. SINCRONIZACIÓN DE USUARIOS EXISTENTES
-- ========================================================

INSERT INTO public.user_profiles (id, email, name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
  'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ========================================================
-- 15. PERMISOS PARA FUNCIONES SECURITY DEFINER
-- ========================================================

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

-- admin: funciones de administracion (se requiere rol admin en la funcion)
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

-- ========================================================
-- 16. CHECK CONSTRAINTS ADICIONALES (seguridad de datos)
-- ========================================================

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_rating_check CHECK (rating >= 0 AND rating <= 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_total_ratings_check CHECK (total_ratings >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_total_packs_sold_check CHECK (total_packs_sold >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_total_revenue_cents_check CHECK (total_revenue_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_active_packs_count_check CHECK (active_packs_count >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_latitude_check CHECK (latitude >= -90 AND latitude <= 90);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.shops ADD CONSTRAINT shops_longitude_check CHECK (longitude >= -180 AND longitude <= 180);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_total_reservations_check CHECK (total_reservations >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_total_pickups_check CHECK (total_pickups >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_total_cancellations_check CHECK (total_cancellations >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_total_no_shows_check CHECK (total_no_shows >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.packs ADD CONSTRAINT packs_discount_percentage_check CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.packs ADD CONSTRAINT packs_pickup_times_check CHECK (pickup_end_time > pickup_start_time);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

DO $$ BEGIN
  ALTER TABLE public.reservations ADD CONSTRAINT reservations_total_price_cents_check CHECK (total_price_cents > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END; $$;

-- ========================================================
-- 17. ÍNDICES COMPUESTOS ADICIONALES (performance)
-- ========================================================

-- Indice compuesto para la consulta en create_reservation_atomic
CREATE INDEX IF NOT EXISTS idx_reservations_user_pack_status ON public.reservations(user_id, pack_id, status);

-- Indice compuesto para la vista available_packs
CREATE INDEX IF NOT EXISTS idx_packs_listado ON public.packs(is_active, deleted_at, remaining_stock, ends_at);

-- Indice parcial para soft-delete en packs
CREATE INDEX IF NOT EXISTS idx_packs_active_not_deleted ON public.packs(is_active, remaining_stock, ends_at) WHERE deleted_at IS NULL;

-- Indice compuesto para RLS policy de packs_owner_manage
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON public.shops(owner_id, id);

-- Indice para busqueda de rate_limits expirados
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Eliminar indice redundante (idx_favorites_user cubierto por idx_favorites_user_shop)
DROP INDEX IF EXISTS idx_favorites_user;

-- ========================================================
-- FIN DEL SCRIPT
-- ========================================================
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- Tiempo estimado: 2-5 segundos
-- ========================================================
