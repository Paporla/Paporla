-- ============================================================================
-- PAPORLA — 0037_sales_during_pickup_window.sql
-- Un pack se puede reservar MIENTRAS SU VENTANA DE RETIRO ESTÁ ABIERTA, hasta
-- 15 minutos antes de que termine.
--
-- Regla anterior (heredada de 0009/0011/0014): la venta se cortaba al INICIO
-- de la ventana (pickup_start_at > now()). Justo cuando la comida está lista
-- para rescatar, desaparecía del catálogo. Con ventana 15:00-18:00, a las
-- 15:05 el pack seguía teniendo todo el sentido del mundo.
--
-- Regla nueva, en una sola expresión en TODOS los puntos de decisión:
--     pickup_end_at > now() + interval '15 minutes'
-- El margen de 15 min da tiempo al comercio a preparar el pack y al cliente a
-- llegar (y cubre de sobra el hold de checkout de 10 min).
--
-- Se recrean (CREATE OR REPLACE, misma firma: los GRANT se conservan) las 5
-- funciones que aplicaban la regla vieja + la política RLS de lectura pública:
--   1. search_available_packs      (0014) — catálogo público
--   2. packs_public_read           (0011) — RLS de packs
--   3. create_payment_reservation  (0009) — crear la reserva
--   4. publish_pack                (0009) — publicar con ventana ya abierta
--   5. set_pack_paused             (0009) — reanudar con ventana ya abierta
--   6. adjust_pack_stock           (0009) — sold_out vuelve a active si hay margen
--
-- Cambios de coherencia que NO se hacen (a propósito):
--   - create_pack_draft / update_pack_content siguen exigiendo inicio futuro:
--     un pack NUEVO se define hacia delante; para vender sobras de una ventana
--     en curso el comercio pone el inicio unos minutos más adelante.
--   - capture_scheduled_at ya usa GREATEST(now, ...): una reserva hecha con la
--     ventana abierta captura de inmediato, sin cambios.
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción. Idempotente.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- RLS: la fila pública del pack sigue visible mientras se pueda reservar.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS packs_public_read ON public.packs;
CREATE POLICY packs_public_read ON public.packs
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND remaining_stock > 0
    AND (sales_start_at IS NULL OR sales_start_at <= now())
    AND pickup_end_at > now() + interval '15 minutes'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = packs.shop_id
        AND s.status = 'verified'
        AND s.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Catálogo público (0014)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_available_packs(
  p_market_id uuid,
  p_locality_id uuid DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_radius_meters integer DEFAULT 10000,
  p_query text DEFAULT NULL,
  p_cursor_pickup_start_at timestamptz DEFAULT NULL,
  p_cursor_pack_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  pack_id uuid,
  shop_id uuid,
  locality_id uuid,
  title text,
  description text,
  category text,
  tags text[],
  allergen_notice text,
  price_minor bigint,
  original_price_minor bigint,
  currency_code text,
  remaining_stock integer,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone text,
  image_path text,
  shop_name text,
  shop_category text,
  locality_name text,
  shop_address text,
  shop_latitude double precision,
  shop_longitude double precision,
  shop_rating numeric,
  shop_rating_count integer,
  distance_meters double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_origin extensions.geography;
  v_query text := NULLIF(btrim(p_query), '');
BEGIN
  IF p_market_id IS NULL OR p_limit NOT BETWEEN 1 AND 50
     OR p_radius_meters NOT BETWEEN 500 AND 100000
     OR (p_latitude IS NULL) <> (p_longitude IS NULL)
     OR (p_latitude IS NOT NULL AND p_latitude NOT BETWEEN -90 AND 90)
     OR (p_longitude IS NOT NULL AND p_longitude NOT BETWEEN -180 AND 180)
     OR (v_query IS NOT NULL AND length(v_query) > 100)
     OR (p_cursor_pickup_start_at IS NULL) <> (p_cursor_pack_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SEARCH_ARGUMENTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.markets m
    WHERE m.id = p_market_id AND m.status IN ('pilot', 'active')
  ) THEN
    RETURN;
  END IF;

  IF p_locality_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.localities l
    WHERE l.id = p_locality_id AND l.market_id = p_market_id AND l.is_active = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_MISMATCH';
  END IF;

  IF p_latitude IS NOT NULL THEN
    v_origin := extensions.ST_SetSRID(
      extensions.ST_MakePoint(p_longitude, p_latitude), 4326
    )::extensions.geography;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.shop_id,
    s.locality_id,
    p.title,
    p.description,
    p.category,
    p.tags,
    p.allergen_notice,
    p.price_minor,
    p.original_price_minor,
    p.currency_code,
    p.remaining_stock,
    p.pickup_start_at,
    p.pickup_end_at,
    p.timezone_snapshot,
    p.image_path,
    s.name,
    s.category,
    l.name,
    NULLIF(concat_ws(', ', s.address_line1, s.address_line2), ''),
    s.latitude,
    s.longitude,
    CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END,
    COALESCE(ss.rating_count, 0),
    CASE
      WHEN v_origin IS NULL OR s.geog IS NULL THEN NULL
      ELSE extensions.ST_Distance(s.geog, v_origin)
    END
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.localities l ON l.id = s.locality_id AND l.market_id = s.market_id
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE p.market_id = p_market_id
    AND (p_locality_id IS NULL OR s.locality_id = p_locality_id)
    AND p.status = 'active'
    AND p.remaining_stock > 0
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND p.pickup_end_at > now() + interval '15 minutes'
    AND s.status = 'verified'
    AND s.deleted_at IS NULL
    AND (v_origin IS NULL OR (s.geog IS NOT NULL AND extensions.ST_DWithin(s.geog, v_origin, p_radius_meters)))
    AND (
      v_query IS NULL
      OR p.title ILIKE '%' || v_query || '%'
      OR COALESCE(p.description, '') ILIKE '%' || v_query || '%'
      OR extensions.similarity(p.title, v_query) >= 0.2
    )
    AND (
      p_cursor_pickup_start_at IS NULL
      OR (p.pickup_start_at, p.id) > (p_cursor_pickup_start_at, p_cursor_pack_id)
    )
  ORDER BY p.pickup_start_at ASC, p.id ASC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Crear reserva (0009)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_payment_reservation(
  p_pack_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
  v_user_market_id uuid;
  v_existing public.reservations%ROWTYPE;
  v_pack record;
  v_reservation public.reservations%ROWTYPE;
  v_now timestamptz := now();
  v_hold_expires_at timestamptz;
  v_capture_scheduled_at timestamptz;
BEGIN
  IF v_role <> 'user' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'USER_ROLE_REQUIRED';
  END IF;

  IF p_pack_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'PACK_AND_IDEMPOTENCY_REQUIRED';
  END IF;

  SELECT * INTO v_existing
  FROM public.reservations r
  WHERE r.user_id = v_user_id AND r.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.pack_id <> p_pack_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'IDEMPOTENCY_KEY_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'reservation_id', v_existing.id,
      'status', v_existing.status,
      'payment_status', v_existing.payment_status,
      'hold_expires_at', v_existing.checkout_hold_expires_at,
      'amount_minor', v_existing.total_amount_minor,
      'currency_code', v_existing.currency_code
    );
  END IF;

  SELECT p.market_id INTO v_user_market_id
  FROM public.user_profiles p
  WHERE p.id = v_user_id;

  SELECT
    p.*,
    s.status AS shop_status,
    s.name AS shop_name,
    s.address_line1,
    s.address_line2,
    s.locality_id,
    m.reservation_hold_minutes,
    m.cancellation_cutoff_minutes,
    m.no_show_policy
  INTO v_pack
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.markets m ON m.id = p.market_id
  WHERE p.id = p_pack_id
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PACK_NOT_FOUND';
  END IF;

  IF v_user_market_id IS DISTINCT FROM v_pack.market_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MARKET_MISMATCH';
  END IF;

  IF v_pack.shop_status <> 'verified'
     OR v_pack.status <> 'active'
     OR v_pack.remaining_stock < 1
     OR v_pack.pickup_end_at <= v_now + interval '15 minutes'
     OR (v_pack.sales_start_at IS NOT NULL AND v_pack.sales_start_at > v_now) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_AVAILABLE';
  END IF;

  IF v_pack.no_show_policy NOT IN ('track_only', 'disabled')
     AND EXISTS (
       SELECT 1 FROM public.user_penalties up
       WHERE up.user_id = v_user_id
         AND up.market_id = v_pack.market_id
         AND up.enforcement_status = 'blocked'
         AND (up.expires_at IS NULL OR up.expires_at > v_now)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'RESERVATIONS_TEMPORARILY_BLOCKED';
  END IF;

  v_hold_expires_at := v_now + make_interval(mins => v_pack.reservation_hold_minutes);
  v_capture_scheduled_at := GREATEST(
    v_now,
    v_pack.pickup_start_at - make_interval(mins => v_pack.cancellation_cutoff_minutes)
  );

  INSERT INTO public.reservations (
    idempotency_key, user_id, shop_id, pack_id, market_id,
    quantity, unit_price_minor, total_amount_minor, currency_code,
    status, payment_status, checkout_hold_expires_at, capture_scheduled_at,
    pickup_start_at, pickup_end_at, timezone_snapshot,
    pack_title_snapshot, shop_name_snapshot, shop_address_snapshot
  )
  VALUES (
    p_idempotency_key, v_user_id, v_pack.shop_id, v_pack.id, v_pack.market_id,
    1, v_pack.price_minor, v_pack.price_minor, v_pack.currency_code,
    'payment_pending', 'created', v_hold_expires_at, v_capture_scheduled_at,
    v_pack.pickup_start_at, v_pack.pickup_end_at, v_pack.timezone_snapshot,
    v_pack.title, v_pack.shop_name,
    NULLIF(concat_ws(', ', v_pack.address_line1, v_pack.address_line2), '')
  )
  RETURNING * INTO v_reservation;

  UPDATE public.packs
  SET
    remaining_stock = remaining_stock - 1,
    status = CASE WHEN remaining_stock - 1 = 0 THEN 'sold_out' ELSE status END,
    updated_at = v_now
  WHERE id = v_pack.id;

  PERFORM app_private.enqueue_event(
    'reservation.checkout_hold_created',
    'reservation',
    v_reservation.id,
    v_reservation.market_id,
    'reservation:' || v_reservation.id || ':checkout_hold_created',
    jsonb_build_object('reservation_id', v_reservation.id),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'reservation_id', v_reservation.id,
    'status', v_reservation.status,
    'payment_status', v_reservation.payment_status,
    'hold_expires_at', v_reservation.checkout_hold_expires_at,
    'capture_scheduled_at', v_reservation.capture_scheduled_at,
    'amount_minor', v_reservation.total_amount_minor,
    'currency_code', v_reservation.currency_code
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Publicar pack (0009)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_pack(p_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_pack public.packs%ROWTYPE;
  v_shop_status text;
BEGIN
  SELECT p.* INTO v_pack
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id
  WHERE p.id = p_pack_id AND s.owner_id = v_user_id
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_OWNED';
  END IF;

  SELECT s.status INTO v_shop_status
  FROM public.shops s
  WHERE s.id = v_pack.shop_id;

  IF v_shop_status <> 'verified' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_NOT_VERIFIED';
  END IF;

  IF v_pack.status NOT IN ('draft', 'paused')
     OR v_pack.remaining_stock < 1
     OR v_pack.pickup_end_at <= now() + interval '15 minutes'
     OR v_pack.allergen_notice IS NULL
     OR v_pack.image_path IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_PUBLISHABLE';
  END IF;

  UPDATE public.packs
  SET status = 'active', published_at = COALESCE(published_at, now()),
      updated_by = v_user_id, updated_at = now()
  WHERE id = p_pack_id;

  PERFORM app_private.enqueue_event(
    'pack.published', 'pack', p_pack_id, v_pack.market_id,
    'pack:' || p_pack_id || ':published:' || txid_current()::text,
    jsonb_build_object('pack_id', p_pack_id, 'shop_id', v_pack.shop_id), now()
  );

  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id, 'status', 'active');
END;
$$;

-- ---------------------------------------------------------------------------
-- Pausar/reanudar pack (0009)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_pack_paused(
  p_pack_id uuid,
  p_paused boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_pack public.packs%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT p.* INTO v_pack
  FROM public.packs p JOIN public.shops s ON s.id = p.shop_id
  WHERE p.id = p_pack_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed')
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_OWNED';
  END IF;

  IF p_paused THEN
    IF v_pack.status <> 'active' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_ACTIVE';
    END IF;
    v_new_status := 'paused';
  ELSE
    IF v_pack.status <> 'paused'
       OR v_pack.remaining_stock < 1
       OR v_pack.pickup_end_at <= now() + interval '15 minutes'
       OR NOT EXISTS (
         SELECT 1 FROM public.shops s
         WHERE s.id = v_pack.shop_id AND s.status = 'verified' AND s.deleted_at IS NULL
       ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_NOT_RESUMABLE';
    END IF;
    v_new_status := 'active';
  END IF;

  UPDATE public.packs
  SET status = v_new_status, updated_by = v_user_id, updated_at = now()
  WHERE id = p_pack_id;

  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id, 'status', v_new_status);
END;
$$;

-- ---------------------------------------------------------------------------
-- Ajustar stock (0009)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_pack_stock(
  p_pack_id uuid,
  p_new_total_stock integer
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_pack public.packs%ROWTYPE;
  v_committed integer;
  v_new_remaining integer;
  v_new_status text;
BEGIN
  SELECT p.* INTO v_pack
  FROM public.packs p JOIN public.shops s ON s.id = p.shop_id
  WHERE p.id = p_pack_id
    AND (s.owner_id = v_user_id OR app_private.is_admin(v_user_id))
    AND s.status NOT IN ('closed')
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_AUTHORIZED';
  END IF;

  IF v_pack.status IN ('expired', 'archived') OR p_new_total_stock < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_STOCK_CHANGE';
  END IF;

  -- Pack row locking serializes this operation with reservation creation.
  v_committed := v_pack.total_stock - v_pack.remaining_stock;
  IF p_new_total_stock < v_committed THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STOCK_BELOW_COMMITTED_UNITS';
  END IF;

  v_new_remaining := p_new_total_stock - v_committed;
  v_new_status := CASE
    WHEN v_pack.status IN ('draft', 'paused') THEN v_pack.status
    WHEN v_new_remaining = 0 THEN 'sold_out'
    WHEN v_pack.status = 'sold_out' AND v_pack.pickup_end_at > now() + interval '15 minutes' THEN 'active'
    ELSE v_pack.status
  END;

  UPDATE public.packs
  SET total_stock = p_new_total_stock,
      remaining_stock = v_new_remaining,
      status = v_new_status,
      updated_by = v_user_id,
      updated_at = now()
  WHERE id = p_pack_id;

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', p_pack_id,
    'total_stock', p_new_total_stock,
    'remaining_stock', v_new_remaining,
    'status', v_new_status
  );
END;
$$;

COMMIT;
