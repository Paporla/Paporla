-- ============================================================================
-- PAPORLA — 0009_functions.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Canonical helpers and transactional RPCs. Grants are added only in 0012.
-- External payment-provider API calls remain in trusted server code.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Internal authorization helpers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.require_active_caller()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.id = v_user_id
      AND p.account_status = 'active'
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ACCOUNT_NOT_ACTIVE';
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.role
  FROM public.user_profiles p
  WHERE p.id = p_user_id
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION app_private.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(app_private.user_role(p_user_id) IN ('admin', 'super_admin'), false);
$$;

CREATE OR REPLACE FUNCTION app_private.is_current_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private
AS $$
  SELECT app_private.is_admin(auth.uid());
$$;

CREATE OR REPLACE FUNCTION app_private.owns_shop(p_user_id uuid, p_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shops s
    WHERE s.id = p_shop_id
      AND s.owner_id = p_user_id
      AND s.status NOT IN ('closed', 'suspended')
      AND s.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION app_private.require_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Do not trust current_user inside SECURITY DEFINER: it is the function owner.
  -- The JWT role claim is the authorization signal for PostgREST service calls.
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SERVICE_ROLE_REQUIRED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.enqueue_event(
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_market_id uuid,
  p_dedupe_key text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_available_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.outbox_events (
    event_type, aggregate_type, aggregate_id, market_id,
    dedupe_key, payload, available_at
  )
  VALUES (
    p_event_type, p_aggregate_type, p_aggregate_id, p_market_id,
    p_dedupe_key, COALESCE(p_payload, '{}'::jsonb), p_available_at
  )
  ON CONFLICT (dedupe_key) DO UPDATE
    SET dedupe_key = EXCLUDED.dedupe_key
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Small idempotent client actions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_favorite(
  p_shop_id uuid,
  p_enabled boolean
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
BEGIN
  IF v_role <> 'user' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'USER_ROLE_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = p_shop_id AND s.status = 'verified' AND s.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'SHOP_NOT_AVAILABLE';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.favorites (user_id, shop_id)
    VALUES (v_user_id, p_shop_id)
    ON CONFLICT (user_id, shop_id) DO NOTHING;
  ELSE
    DELETE FROM public.favorites
    WHERE user_id = v_user_id AND shop_id = p_shop_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'enabled', p_enabled);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'NOTIFICATION_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Create one 10-minute checkout/stock hold. Provider authorization happens in
-- trusted server code after this transaction returns.
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
     OR v_pack.pickup_start_at <= v_now
     OR v_pack.pickup_end_at <= v_now
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
-- Cancel before pickup. Before capture, an authorization is voided asynchronously;
-- after capture only admin/super_admin can request a full refund.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text
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
  v_res public.reservations%ROWTYPE;
  v_pack public.packs%ROWTYPE;
  v_is_admin boolean := app_private.is_admin(v_user_id);
  v_is_owner boolean;
  v_is_shop_owner boolean;
  v_cutoff_minutes smallint;
  v_now timestamptz := now();
  v_payment_action text := 'none';
BEGIN
  IF p_reservation_id IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CANCELLATION_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  IF v_res.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'reservation_id', v_res.id,
      'payment_action', CASE
        WHEN v_res.payment_status = 'refund_pending' THEN 'refund'
        WHEN v_res.payment_status = 'cancelled' THEN 'void_or_cancel'
        ELSE 'none'
      END
    );
  END IF;

  IF v_res.status NOT IN ('payment_pending', 'confirmed', 'ready_pickup') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_CANCELLABLE';
  END IF;

  v_is_owner := v_res.user_id = v_user_id;
  v_is_shop_owner := app_private.owns_shop(v_user_id, v_res.shop_id);

  IF NOT COALESCE(v_is_owner, false)
     AND NOT COALESCE(v_is_shop_owner, false)
     AND NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_AUTHORIZED_FOR_RESERVATION';
  END IF;

  IF NOT v_is_admin THEN
    SELECT cancellation_cutoff_minutes INTO v_cutoff_minutes
    FROM public.markets WHERE id = v_res.market_id;

    IF v_now > v_res.pickup_start_at - make_interval(mins => v_cutoff_minutes) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CANCELLATION_WINDOW_CLOSED';
    END IF;
  END IF;

  SELECT * INTO v_pack FROM public.packs WHERE id = v_res.pack_id FOR UPDATE;

  UPDATE public.packs
  SET
    remaining_stock = LEAST(total_stock, remaining_stock + v_res.quantity),
    status = CASE
      WHEN status = 'sold_out' AND pickup_end_at > v_now THEN 'active'
      ELSE status
    END,
    updated_at = v_now
  WHERE id = v_res.pack_id;

  v_payment_action := CASE
    WHEN v_res.payment_status = 'authorized' THEN 'void_authorization'
    WHEN v_res.payment_status IN ('paid', 'capture_pending') THEN 'refund'
    WHEN v_res.payment_status IN ('created', 'pending') THEN 'cancel_checkout'
    ELSE 'none'
  END;

  UPDATE public.reservations
  SET
    status = 'cancelled',
    payment_status = CASE
      WHEN v_payment_action = 'refund' THEN 'refund_pending'
      WHEN v_payment_action IN ('void_authorization', 'cancel_checkout') THEN 'cancelled'
      ELSE payment_status
    END,
    cancelled_by = v_user_id,
    cancelled_actor_role = v_role,
    cancel_reason = btrim(p_reason),
    cancelled_at = v_now,
    updated_at = v_now
  WHERE id = v_res.id;

  IF v_payment_action = 'void_authorization' THEN
    PERFORM app_private.enqueue_event(
      'payment.void_requested', 'reservation', v_res.id, v_res.market_id,
      'reservation:' || v_res.id || ':payment_void_requested',
      jsonb_build_object('reservation_id', v_res.id), v_now
    );
  ELSIF v_payment_action = 'refund' THEN
    PERFORM app_private.enqueue_event(
      'payment.refund_requested', 'reservation', v_res.id, v_res.market_id,
      'reservation:' || v_res.id || ':payment_refund_requested',
      jsonb_build_object('reservation_id', v_res.id, 'reason', btrim(p_reason)), v_now
    );
  END IF;

  PERFORM app_private.enqueue_event(
    'reservation.cancelled', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':cancelled',
    jsonb_build_object('reservation_id', v_res.id, 'actor_role', v_role), v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'reservation_id', v_res.id,
    'payment_action', v_payment_action
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Merchant/admin delivery confirmation. QR token and manual code are both
-- SHA-256 compared. The user can announce arrival but cannot complete delivery.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_pickup(
  p_credential text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public, extensions
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
  v_hash bytea;
  v_res public.reservations%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF v_role <> 'comercio' AND NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MERCHANT_OR_ADMIN_REQUIRED';
  END IF;

  IF p_credential IS NULL OR length(p_credential) NOT BETWEEN 8 AND 512 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PICKUP_CREDENTIAL';
  END IF;

  v_hash := extensions.digest(p_credential, 'sha256');

  SELECT * INTO v_res
  FROM public.reservations
  WHERE pickup_token_hash = v_hash OR pickup_code_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PICKUP_CREDENTIAL_NOT_FOUND';
  END IF;

  IF v_role = 'comercio' AND NOT app_private.owns_shop(v_user_id, v_res.shop_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WRONG_SHOP';
  END IF;

  IF v_res.status <> 'ready_pickup'
     OR v_res.payment_status <> 'paid'
     OR v_res.pickup_credential_used_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_READY';
  END IF;

  IF v_now < v_res.pickup_start_at
     OR v_now > v_res.pickup_end_at + interval '30 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OUTSIDE_PICKUP_WINDOW';
  END IF;

  UPDATE public.reservations
  SET
    status = 'picked_up',
    picked_up_at = v_now,
    pickup_credential_used_at = v_now,
    updated_at = v_now
  WHERE id = v_res.id;

  PERFORM app_private.enqueue_event(
    'reservation.picked_up', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':picked_up',
    jsonb_build_object('reservation_id', v_res.id, 'shop_id', v_res.shop_id), v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_res.id,
    'pack_title', v_res.pack_title_snapshot,
    'quantity', v_res.quantity
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Service-only payment state recorders. Provider API calls and signature checks
-- occur in trusted backend code before invoking these functions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_record_payment_authorized(
  p_reservation_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_idempotency_key uuid,
  p_authorized_at timestamptz,
  p_authorization_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res public.reservations%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_provider IS NULL
     OR p_provider_payment_id IS NULL
     OR p_idempotency_key IS NULL
     OR p_authorized_at IS NULL
     OR p_authorization_expires_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'PAYMENT_AUTHORIZATION_FIELDS_REQUIRED';
  END IF;

  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  IF v_res.status = 'confirmed' AND v_res.payment_status = 'authorized' THEN
    SELECT * INTO v_payment
    FROM public.payments
    WHERE reservation_id = v_res.id AND provider = p_provider
      AND provider_payment_id = p_provider_payment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_STATE_INCONSISTENT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'payment_id', v_payment.id,
      'reservation_id', v_res.id
    );
  END IF;

  IF v_res.status <> 'payment_pending' OR v_res.checkout_hold_expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHECKOUT_HOLD_EXPIRED';
  END IF;

  IF p_authorization_expires_at <= p_authorized_at
     OR v_res.capture_scheduled_at >= p_authorization_expires_at THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'AUTHORIZATION_WINDOW_TOO_SHORT';
  END IF;

  INSERT INTO public.payments (
    reservation_id, market_id, provider, provider_payment_id,
    idempotency_key, amount_minor, currency_code, status,
    capture_mode, supports_manual_capture_snapshot,
    provider_created_at, authorized_at, authorization_expires_at,
    capture_scheduled_at
  )
  VALUES (
    v_res.id, v_res.market_id, p_provider, p_provider_payment_id,
    p_idempotency_key, v_res.total_amount_minor, v_res.currency_code, 'authorized',
    'manual', true,
    p_authorized_at, p_authorized_at, p_authorization_expires_at,
    v_res.capture_scheduled_at
  )
  RETURNING * INTO v_payment;

  UPDATE public.reservations
  SET status = 'confirmed', payment_status = 'authorized',
      confirmed_at = COALESCE(confirmed_at, p_authorized_at), updated_at = now()
  WHERE id = v_res.id;

  PERFORM app_private.enqueue_event(
    'reservation.confirmed', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':confirmed',
    jsonb_build_object('reservation_id', v_res.id), now()
  );

  PERFORM app_private.enqueue_event(
    'payment.capture_requested', 'payment', v_payment.id, v_res.market_id,
    'payment:' || v_payment.id || ':capture_requested',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'reservation_id', v_res.id,
      'capture_before', p_authorization_expires_at
    ),
    v_res.capture_scheduled_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'payment_id', v_payment.id,
    'reservation_id', v_res.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_record_payment_paid(
  p_reservation_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_idempotency_key uuid,
  p_captured_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res public.reservations%ROWTYPE;
  v_payment_id uuid;
  v_payment_reservation_id uuid;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_provider IS NULL
     OR p_provider_payment_id IS NULL
     OR p_idempotency_key IS NULL
     OR p_captured_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'PAYMENT_CAPTURE_FIELDS_REQUIRED';
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE id = p_reservation_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  SELECT id, reservation_id INTO v_payment_id, v_payment_reservation_id
  FROM public.payments
  WHERE provider = p_provider AND provider_payment_id = p_provider_payment_id;

  IF FOUND THEN
    IF v_payment_reservation_id <> v_res.id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_RESERVATION_MISMATCH';
    END IF;

    IF v_res.payment_status = 'paid' THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'payment_id', v_payment_id,
        'reservation_id', v_res.id
      );
    END IF;

    IF v_res.status <> 'payment_pending' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_PAYABLE';
    END IF;

    UPDATE public.payments
    SET status = 'paid', captured_at = COALESCE(captured_at, p_captured_at), updated_at = now()
    WHERE id = v_payment_id AND status <> 'paid';
  ELSE
    IF v_res.status <> 'payment_pending' OR v_res.checkout_hold_expires_at <= now() THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHECKOUT_HOLD_EXPIRED';
    END IF;

    INSERT INTO public.payments (
      reservation_id, market_id, provider, provider_payment_id,
      idempotency_key, amount_minor, currency_code, status,
      capture_mode, supports_manual_capture_snapshot,
      provider_created_at, captured_at
    )
    VALUES (
      v_res.id, v_res.market_id, p_provider, p_provider_payment_id,
      p_idempotency_key, v_res.total_amount_minor, v_res.currency_code, 'paid',
      'automatic', false, p_captured_at, p_captured_at
    )
    RETURNING id INTO v_payment_id;
  END IF;

  UPDATE public.reservations
  SET
    status = CASE WHEN status = 'payment_pending' THEN 'confirmed' ELSE status END,
    payment_status = 'paid',
    confirmed_at = COALESCE(confirmed_at, p_captured_at),
    updated_at = now()
  WHERE id = v_res.id;

  PERFORM app_private.enqueue_event(
    'payment.captured', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':payment_captured',
    jsonb_build_object('reservation_id', v_res.id, 'payment_id', v_payment_id), now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'reservation_id', v_res.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_mark_authorized_payment_captured(
  p_payment_id uuid,
  p_captured_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_res public.reservations%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_payment_id IS NULL OR p_captured_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'PAYMENT_CAPTURE_FIELDS_REQUIRED';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PAYMENT_NOT_FOUND';
  END IF;

  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true);
  END IF;

  IF v_payment.status NOT IN ('authorized', 'capture_pending') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_CAPTURABLE';
  END IF;

  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = v_payment.reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  UPDATE public.payments
  SET status = 'paid', captured_at = p_captured_at, updated_at = now()
  WHERE id = v_payment.id;

  IF v_res.status IN ('cancelled', 'expired') THEN
    UPDATE public.reservations
    SET payment_status = 'refund_pending', updated_at = now()
    WHERE id = v_res.id;

    PERFORM app_private.enqueue_event(
      'payment.refund_requested', 'payment', v_payment.id, v_payment.market_id,
      'payment:' || v_payment.id || ':late_capture_refund_requested',
      jsonb_build_object(
        'payment_id', v_payment.id,
        'reservation_id', v_payment.reservation_id,
        'reason', 'late_capture_after_terminal_reservation'
      ), now()
    );
  ELSE
    UPDATE public.reservations
    SET payment_status = 'paid', updated_at = now()
    WHERE id = v_res.id AND status IN ('confirmed', 'ready_pickup', 'no_show');
  END IF;

  PERFORM app_private.enqueue_event(
    'payment.captured', 'payment', v_payment.id, v_payment.market_id,
    'payment:' || v_payment.id || ':captured',
    jsonb_build_object('payment_id', v_payment.id, 'reservation_id', v_payment.reservation_id), now()
  );

  RETURN jsonb_build_object('success', true, 'idempotent_replay', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- Service-only pickup credential issuance. Trusted server derives random/HMAC
-- credentials, sends only SHA-256 hashes to this function and returns raw values
-- to the authenticated user through a separate protected API response.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_issue_pickup_credentials(
  p_reservation_id uuid,
  p_token_hash bytea,
  p_code_hash bytea,
  p_version smallint DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res public.reservations%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  IF octet_length(p_token_hash) <> 32 OR octet_length(p_code_hash) <> 32 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CREDENTIAL_HASH';
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE id = p_reservation_id FOR UPDATE;

  IF NOT FOUND OR v_res.status <> 'ready_pickup' OR v_res.payment_status <> 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_READY';
  END IF;

  IF v_res.pickup_token_hash IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true);
  END IF;

  UPDATE public.reservations
  SET
    pickup_credential_version = p_version,
    pickup_token_hash = p_token_hash,
    pickup_code_hash = p_code_hash,
    pickup_credential_issued_at = now(),
    updated_at = now()
  WHERE id = v_res.id;

  RETURN jsonb_build_object('success', true, 'idempotent_replay', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- Bounded cron/service batch operations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_expire_payment_holds(p_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res record;
  v_count integer := 0;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BATCH_LIMIT';
  END IF;

  FOR v_res IN
    SELECT r.id, r.pack_id, r.market_id, r.quantity
    FROM public.reservations r
    WHERE r.status = 'payment_pending'
      AND r.checkout_hold_expires_at <= now()
    ORDER BY r.checkout_hold_expires_at, r.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.reservations
    SET status = 'expired', payment_status = 'failed', expired_at = now(), updated_at = now()
    WHERE id = v_res.id AND status = 'payment_pending';

    IF FOUND THEN
      UPDATE public.packs
      SET
        remaining_stock = LEAST(total_stock, remaining_stock + v_res.quantity),
        status = CASE
          WHEN status = 'sold_out' AND pickup_end_at > now() THEN 'active'
          ELSE status
        END,
        updated_at = now()
      WHERE id = v_res.pack_id;

      PERFORM app_private.enqueue_event(
        'reservation.payment_hold_expired', 'reservation', v_res.id, v_res.market_id,
        'reservation:' || v_res.id || ':payment_hold_expired',
        jsonb_build_object('reservation_id', v_res.id), now()
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_open_pickup_windows(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res record;
  v_count integer := 0;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BATCH_LIMIT';
  END IF;

  FOR v_res IN
    SELECT r.id, r.market_id
    FROM public.reservations r
    WHERE r.status = 'confirmed'
      AND r.payment_status = 'paid'
      AND r.pickup_start_at <= now()
      AND r.pickup_end_at > now()
    ORDER BY r.pickup_start_at, r.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.reservations
    SET status = 'ready_pickup', ready_at = now(), updated_at = now()
    WHERE id = v_res.id AND status = 'confirmed' AND payment_status = 'paid';

    IF FOUND THEN
      PERFORM app_private.enqueue_event(
        'reservation.pickup_window_opened', 'reservation', v_res.id, v_res.market_id,
        'reservation:' || v_res.id || ':pickup_window_opened',
        jsonb_build_object('reservation_id', v_res.id), now()
      );
      PERFORM app_private.enqueue_event(
        'reservation.issue_pickup_credentials', 'reservation', v_res.id, v_res.market_id,
        'reservation:' || v_res.id || ':issue_pickup_credentials',
        jsonb_build_object('reservation_id', v_res.id), now()
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_mark_no_shows(p_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_res record;
  v_policy text;
  v_count integer := 0;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BATCH_LIMIT';
  END IF;

  FOR v_res IN
    SELECT r.id, r.user_id, r.market_id
    FROM public.reservations r
    WHERE r.status IN ('confirmed', 'ready_pickup')
      AND r.payment_status = 'paid'
      AND r.pickup_end_at < now()
    ORDER BY r.pickup_end_at, r.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.reservations
    SET status = 'no_show', no_show_at = now(), updated_at = now()
    WHERE id = v_res.id AND status IN ('confirmed', 'ready_pickup');

    IF FOUND THEN
      SELECT no_show_policy INTO v_policy FROM public.markets WHERE id = v_res.market_id;

      IF v_res.user_id IS NOT NULL AND v_policy <> 'disabled' THEN
        INSERT INTO public.user_penalties (
          user_id, market_id, reason, enforcement_status,
          source_reservation_id, starts_at
        )
        VALUES (
          v_res.user_id, v_res.market_id, 'no_show',
          CASE WHEN v_policy = 'progressive' THEN 'warning' ELSE 'recorded' END,
          v_res.id, now()
        );
      END IF;

      PERFORM app_private.enqueue_event(
        'reservation.no_show', 'reservation', v_res.id, v_res.market_id,
        'reservation:' || v_res.id || ':no_show',
        jsonb_build_object('reservation_id', v_res.id), now()
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_complete_picked_up_reservations(
  p_limit integer DEFAULT 500,
  p_after interval DEFAULT interval '24 hours'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 2000 OR p_after < interval '1 hour' OR p_after > interval '7 days' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_JOB_ARGUMENTS';
  END IF;

  WITH candidates AS (
    SELECT r.id
    FROM public.reservations r
    WHERE r.status = 'picked_up'
      AND r.picked_up_at <= now() - p_after
    ORDER BY r.picked_up_at, r.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.reservations r
    SET status = 'completed', completed_at = now(), updated_at = now()
    FROM candidates c
    WHERE r.id = c.id AND r.status = 'picked_up'
    RETURNING r.id, r.market_id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_cleanup_rate_limits(p_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_limit NOT BETWEEN 1 AND 20000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_BATCH_LIMIT';
  END IF;

  WITH doomed AS (
    SELECT key_hash FROM public.rate_limits
    WHERE window_end < now() AND (blocked_until IS NULL OR blocked_until < now())
    ORDER BY window_end
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.rate_limits r
  USING doomed d
  WHERE r.key_hash = d.key_hash;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- Profile and one-shop MVP management. Every parameter is explicit so clients
-- cannot mass-assign role, verification, counters or audit fields.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_display_name text,
  p_phone_e164 text,
  p_avatar_path text,
  p_market_id uuid,
  p_locality_id uuid,
  p_locale text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF p_market_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.markets m
    WHERE m.id = p_market_id AND m.status IN ('waitlist', 'pilot', 'active')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'MARKET_NOT_AVAILABLE';
  END IF;

  IF p_locality_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.localities l
    WHERE l.id = p_locality_id AND l.market_id = p_market_id AND l.is_active = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_MISMATCH';
  END IF;

  UPDATE public.user_profiles
  SET
    display_name = NULLIF(btrim(p_display_name), ''),
    phone_e164 = NULLIF(btrim(p_phone_e164), ''),
    avatar_path = NULLIF(btrim(p_avatar_path), ''),
    market_id = p_market_id,
    locality_id = p_locality_id,
    locale = p_locale,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_own_shop(
  p_market_id uuid,
  p_locality_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_phone_e164 text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text
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
  v_timezone text;
  v_shop_id uuid;
BEGIN
  IF v_role <> 'comercio' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MERCHANT_ROLE_REQUIRED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.shops s WHERE s.owner_id = v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SHOP_ALREADY_EXISTS';
  END IF;

  SELECT l.timezone INTO v_timezone
  FROM public.localities l
  JOIN public.markets m ON m.id = l.market_id
  WHERE l.id = p_locality_id
    AND l.market_id = p_market_id
    AND l.is_active = true
    AND m.status IN ('pilot', 'active');

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_NOT_ACTIVE';
  END IF;

  INSERT INTO public.shops (
    owner_id, market_id, locality_id, name, description, category,
    phone_e164, address_line1, address_line2, postal_code,
    timezone, status
  )
  VALUES (
    v_user_id, p_market_id, p_locality_id, btrim(p_name),
    NULLIF(btrim(p_description), ''), NULLIF(btrim(p_category), ''),
    NULLIF(btrim(p_phone_e164), ''), NULLIF(btrim(p_address_line1), ''),
    NULLIF(btrim(p_address_line2), ''), NULLIF(btrim(p_postal_code), ''),
    v_timezone, 'draft'
  )
  RETURNING id INTO v_shop_id;

  INSERT INTO public.shop_stats (shop_id) VALUES (v_shop_id);

  RETURN jsonb_build_object('success', true, 'shop_id', v_shop_id, 'status', 'draft');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_own_shop(
  p_shop_id uuid,
  p_locality_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_phone_e164 text,
  p_website_url text,
  p_instagram_handle text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text,
  p_latitude double precision,
  p_longitude double precision,
  p_logo_path text,
  p_cover_path text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_market_id uuid;
  v_timezone text;
BEGIN
  SELECT s.market_id INTO v_market_id
  FROM public.shops s
  WHERE s.id = p_shop_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed') AND s.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_OWNED_OR_INACTIVE';
  END IF;

  SELECT l.timezone INTO v_timezone
  FROM public.localities l
  WHERE l.id = p_locality_id AND l.market_id = v_market_id AND l.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_MISMATCH';
  END IF;

  UPDATE public.shops
  SET
    locality_id = p_locality_id,
    name = btrim(p_name),
    description = NULLIF(btrim(p_description), ''),
    category = NULLIF(btrim(p_category), ''),
    phone_e164 = NULLIF(btrim(p_phone_e164), ''),
    website_url = NULLIF(btrim(p_website_url), ''),
    instagram_handle = NULLIF(btrim(p_instagram_handle), ''),
    address_line1 = NULLIF(btrim(p_address_line1), ''),
    address_line2 = NULLIF(btrim(p_address_line2), ''),
    postal_code = NULLIF(btrim(p_postal_code), ''),
    latitude = p_latitude,
    longitude = p_longitude,
    timezone = v_timezone,
    logo_path = NULLIF(btrim(p_logo_path), ''),
    cover_path = NULLIF(btrim(p_cover_path), ''),
    updated_at = now()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_own_shop_for_review(p_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_shop public.shops%ROWTYPE;
BEGIN
  SELECT * INTO v_shop FROM public.shops
  WHERE id = p_shop_id AND owner_id = v_user_id FOR UPDATE;

  IF NOT FOUND OR v_shop.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_NOT_SUBMITTABLE';
  END IF;

  IF v_shop.locality_id IS NULL OR v_shop.name IS NULL
     OR v_shop.category IS NULL OR v_shop.phone_e164 IS NULL
     OR v_shop.address_line1 IS NULL OR v_shop.latitude IS NULL
     OR v_shop.longitude IS NULL OR v_shop.logo_path IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_PROFILE_INCOMPLETE';
  END IF;

  UPDATE public.shops
  SET status = 'pending_review', status_reason = NULL,
      reviewed_by = NULL, reviewed_at = NULL, updated_at = now()
  WHERE id = p_shop_id;

  PERFORM app_private.enqueue_event(
    'shop.submitted_for_review', 'shop', p_shop_id, v_shop.market_id,
    'shop:' || p_shop_id || ':review_submission:' || txid_current()::text,
    jsonb_build_object('shop_id', p_shop_id), now()
  );

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id, 'status', 'pending_review');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_shop(
  p_shop_id uuid,
  p_new_status text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_admin_id uuid := app_private.require_active_caller();
  v_market_id uuid;
BEGIN
  IF NOT app_private.is_admin(v_admin_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  IF p_new_status NOT IN ('verified', 'rejected', 'suspended')
     OR p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVIEW_DECISION';
  END IF;

  SELECT market_id INTO v_market_id FROM public.shops
  WHERE id = p_shop_id AND status <> 'closed' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'SHOP_NOT_FOUND';
  END IF;

  UPDATE public.shops
  SET status = p_new_status, status_reason = btrim(p_reason),
      reviewed_by = v_admin_id, reviewed_at = now(), updated_at = now()
  WHERE id = p_shop_id;

  PERFORM app_private.enqueue_event(
    'shop.reviewed', 'shop', p_shop_id, v_market_id,
    'shop:' || p_shop_id || ':review:' || txid_current()::text,
    jsonb_build_object('shop_id', p_shop_id, 'status', p_new_status), now()
  );

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id, 'status', p_new_status);
END;
$$;

-- ---------------------------------------------------------------------------
-- Merchant pack lifecycle. Content changes and stock changes are separate so a
-- client can never mass-assign remaining_stock, status or audit fields.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pack_draft(
  p_shop_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_tags text[],
  p_allergen_notice text,
  p_handling_notice text,
  p_price_minor bigint,
  p_original_price_minor bigint,
  p_total_stock integer,
  p_sales_start_at timestamptz,
  p_pickup_start_at timestamptz,
  p_pickup_end_at timestamptz,
  p_image_path text,
  p_image_gallery text[]
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_shop record;
  v_pack_id uuid;
BEGIN
  IF app_private.user_role(v_user_id) <> 'comercio' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MERCHANT_ROLE_REQUIRED';
  END IF;

  SELECT s.market_id, s.timezone, s.status, m.currency_code
  INTO v_shop
  FROM public.shops s
  JOIN public.markets m ON m.id = s.market_id
  WHERE s.id = p_shop_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed') AND s.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_OWNED_OR_INACTIVE';
  END IF;

  IF p_pickup_start_at <= now() OR p_pickup_end_at <= p_pickup_start_at THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PICKUP_WINDOW';
  END IF;

  INSERT INTO public.packs (
    shop_id, market_id, title, description, category, tags,
    allergen_notice, handling_notice, price_minor, original_price_minor,
    currency_code, total_stock, remaining_stock, sales_start_at,
    pickup_start_at, pickup_end_at, timezone_snapshot,
    image_path, image_gallery, status, created_by, updated_by
  )
  VALUES (
    p_shop_id, v_shop.market_id, btrim(p_title), NULLIF(btrim(p_description), ''),
    btrim(p_category), COALESCE(p_tags, ARRAY[]::text[]),
    NULLIF(btrim(p_allergen_notice), ''), NULLIF(btrim(p_handling_notice), ''),
    p_price_minor, p_original_price_minor, v_shop.currency_code,
    p_total_stock, p_total_stock, p_sales_start_at,
    p_pickup_start_at, p_pickup_end_at, v_shop.timezone,
    NULLIF(btrim(p_image_path), ''), COALESCE(p_image_gallery, ARRAY[]::text[]),
    'draft', v_user_id, v_user_id
  )
  RETURNING id INTO v_pack_id;

  RETURN jsonb_build_object('success', true, 'pack_id', v_pack_id, 'status', 'draft');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pack_content(
  p_pack_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_tags text[],
  p_allergen_notice text,
  p_handling_notice text,
  p_price_minor bigint,
  p_original_price_minor bigint,
  p_sales_start_at timestamptz,
  p_pickup_start_at timestamptz,
  p_pickup_end_at timestamptz,
  p_image_path text,
  p_image_gallery text[]
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
  v_timezone text;
BEGIN
  SELECT p.* INTO v_pack
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id
  WHERE p.id = p_pack_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed') AND s.deleted_at IS NULL
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_OWNED_OR_INACTIVE';
  END IF;

  IF v_pack.status NOT IN ('draft', 'paused') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_MUST_BE_DRAFT_OR_PAUSED';
  END IF;

  IF p_pickup_start_at <= now() OR p_pickup_end_at <= p_pickup_start_at THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PICKUP_WINDOW';
  END IF;

  SELECT timezone INTO v_timezone FROM public.shops WHERE id = v_pack.shop_id;

  UPDATE public.packs
  SET
    title = btrim(p_title),
    description = NULLIF(btrim(p_description), ''),
    category = btrim(p_category),
    tags = COALESCE(p_tags, ARRAY[]::text[]),
    allergen_notice = NULLIF(btrim(p_allergen_notice), ''),
    handling_notice = NULLIF(btrim(p_handling_notice), ''),
    price_minor = p_price_minor,
    original_price_minor = p_original_price_minor,
    sales_start_at = p_sales_start_at,
    pickup_start_at = p_pickup_start_at,
    pickup_end_at = p_pickup_end_at,
    timezone_snapshot = v_timezone,
    image_path = NULLIF(btrim(p_image_path), ''),
    image_gallery = COALESCE(p_image_gallery, ARRAY[]::text[]),
    updated_by = v_user_id,
    updated_at = now()
  WHERE id = p_pack_id;

  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id, 'status', v_pack.status);
END;
$$;

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
     OR v_pack.pickup_start_at <= now()
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
       OR v_pack.pickup_start_at <= now()
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
    WHEN v_pack.status = 'sold_out' AND v_pack.pickup_start_at > now() THEN 'active'
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

CREATE OR REPLACE FUNCTION public.archive_pack(p_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_pack public.packs%ROWTYPE;
BEGIN
  SELECT p.* INTO v_pack
  FROM public.packs p JOIN public.shops s ON s.id = p.shop_id
  WHERE p.id = p_pack_id AND (s.owner_id = v_user_id OR app_private.is_admin(v_user_id))
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PACK_NOT_AUTHORIZED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.pack_id = p_pack_id
      AND r.status IN ('payment_pending', 'confirmed', 'ready_pickup')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PACK_HAS_ACTIVE_RESERVATIONS';
  END IF;

  UPDATE public.packs
  SET status = 'archived', archived_at = now(),
      updated_by = v_user_id, updated_at = now()
  WHERE id = p_pack_id;

  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id, 'status', 'archived');
END;
$$;

-- ---------------------------------------------------------------------------
-- Provider void/refund reconciliation. These functions are service-only and
-- idempotent; provider API calls happen outside PostgreSQL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_mark_payment_voided(
  p_payment_id uuid,
  p_voided_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_res public.reservations%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_payment_id IS NULL OR p_voided_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'PAYMENT_VOID_FIELDS_REQUIRED';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PAYMENT_NOT_FOUND';
  END IF;

  IF v_payment.status = 'voided' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true);
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE id = v_payment.reservation_id FOR UPDATE;

  IF v_res.status <> 'cancelled' OR v_payment.status NOT IN ('authorized', 'pending', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_VOIDABLE';
  END IF;

  UPDATE public.payments
  SET status = 'voided', voided_at = p_voided_at, updated_at = now()
  WHERE id = v_payment.id;

  UPDATE public.reservations
  SET payment_status = 'voided', updated_at = now()
  WHERE id = v_res.id;

  PERFORM app_private.enqueue_event(
    'payment.voided', 'payment', v_payment.id, v_payment.market_id,
    'payment:' || v_payment.id || ':voided',
    jsonb_build_object('payment_id', v_payment.id, 'reservation_id', v_res.id), now()
  );

  RETURN jsonb_build_object('success', true, 'idempotent_replay', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.service_begin_refund(
  p_payment_id uuid,
  p_idempotency_key uuid,
  p_amount_minor bigint,
  p_reason text,
  p_requested_actor_role text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_res public.reservations%ROWTYPE;
  v_already_refunded bigint;
  v_refund_id uuid;
  v_existing_refund public.payment_refunds%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_idempotency_key IS NULL
     OR p_reason IS NULL OR length(btrim(p_reason)) < 3
     OR p_requested_actor_role NOT IN ('user', 'comercio', 'admin', 'super_admin', 'system') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REFUND_REQUEST';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND OR v_payment.status NOT IN ('paid', 'refund_pending', 'partially_refunded') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_REFUNDABLE';
  END IF;

  SELECT * INTO v_existing_refund
  FROM public.payment_refunds r
  WHERE r.provider = v_payment.provider AND r.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_refund.payment_id <> v_payment.id
       OR v_existing_refund.amount_minor <> p_amount_minor
       OR v_existing_refund.currency_code <> v_payment.currency_code THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'REFUND_IDEMPOTENCY_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'refund_id', v_existing_refund.id,
      'payment_id', v_payment.id,
      'amount_minor', v_existing_refund.amount_minor,
      'currency_code', v_existing_refund.currency_code
    );
  END IF;

  SELECT COALESCE(sum(r.amount_minor), 0) INTO v_already_refunded
  FROM public.payment_refunds r
  WHERE r.payment_id = v_payment.id AND r.status = 'completed';

  IF p_amount_minor <= 0 OR p_amount_minor > v_payment.amount_minor - v_already_refunded THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REFUND_AMOUNT';
  END IF;

  SELECT * INTO v_res FROM public.reservations
  WHERE id = v_payment.reservation_id FOR UPDATE;

  INSERT INTO public.payment_refunds (
    payment_id, provider, idempotency_key, amount_minor, currency_code,
    status, reason, requested_actor_role
  )
  VALUES (
    v_payment.id, v_payment.provider, p_idempotency_key, p_amount_minor,
    v_payment.currency_code, 'pending', btrim(p_reason), p_requested_actor_role
  )
  RETURNING id INTO v_refund_id;

  UPDATE public.payments
  SET status = 'refund_pending', refund_pending_at = COALESCE(refund_pending_at, now()),
      updated_at = now()
  WHERE id = v_payment.id;

  UPDATE public.reservations
  SET payment_status = 'refund_pending', updated_at = now()
  WHERE id = v_res.id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'payment_id', v_payment.id,
    'amount_minor', p_amount_minor,
    'currency_code', v_payment.currency_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_mark_refund_completed(
  p_refund_id uuid,
  p_provider_refund_id text,
  p_completed_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_refund public.payment_refunds%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_total_refunded bigint;
  v_new_status text;
BEGIN
  PERFORM app_private.require_service_role();

  IF p_refund_id IS NULL OR p_provider_refund_id IS NULL OR p_completed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'REFUND_COMPLETION_FIELDS_REQUIRED';
  END IF;

  SELECT * INTO v_refund FROM public.payment_refunds
  WHERE id = p_refund_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'REFUND_NOT_FOUND';
  END IF;

  IF v_refund.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true);
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id = v_refund.payment_id FOR UPDATE;

  UPDATE public.payment_refunds
  SET status = 'completed', provider_refund_id = p_provider_refund_id,
      completed_at = p_completed_at, updated_at = now()
  WHERE id = v_refund.id;

  SELECT COALESCE(sum(r.amount_minor), 0) INTO v_total_refunded
  FROM public.payment_refunds r
  WHERE r.payment_id = v_payment.id AND r.status = 'completed';

  v_new_status := CASE
    WHEN v_total_refunded >= v_payment.amount_minor THEN 'refunded'
    ELSE 'partially_refunded'
  END;

  UPDATE public.payments
  SET status = v_new_status,
      refunded_at = p_completed_at,
      updated_at = now()
  WHERE id = v_payment.id;

  UPDATE public.reservations
  SET payment_status = v_new_status, updated_at = now()
  WHERE id = v_payment.reservation_id;

  PERFORM app_private.enqueue_event(
    'payment.refund_completed', 'payment', v_payment.id, v_payment.market_id,
    'refund:' || v_refund.id || ':completed',
    jsonb_build_object(
      'payment_id', v_payment.id,
      'refund_id', v_refund.id,
      'amount_minor', v_refund.amount_minor,
      'currency_code', v_refund.currency_code
    ), now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'payment_status', v_new_status,
    'total_refunded_minor', v_total_refunded
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_mark_refund_failed(
  p_refund_id uuid,
  p_failure_code text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_refund public.payment_refunds%ROWTYPE;
BEGIN
  PERFORM app_private.require_service_role();

  SELECT * INTO v_refund FROM public.payment_refunds
  WHERE id = p_refund_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'REFUND_NOT_FOUND';
  END IF;

  IF v_refund.status = 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REFUND_ALREADY_COMPLETED';
  END IF;

  UPDATE public.payment_refunds
  SET status = 'failed', failed_at = now(),
      failure_code = left(COALESCE(p_failure_code, 'provider_error'), 120),
      updated_at = now()
  WHERE id = v_refund.id;

  RETURN jsonb_build_object('success', true, 'refund_id', v_refund.id, 'status', 'failed');
END;
$$;

-- ---------------------------------------------------------------------------
-- Outbox worker leasing and completion. SKIP LOCKED allows horizontal workers
-- without duplicate delivery. No raw secret is returned or stored.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_claim_outbox(
  p_worker_id text,
  p_limit integer DEFAULT 100,
  p_lock_timeout interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (
  id uuid,
  event_type text,
  aggregate_type text,
  aggregate_id uuid,
  market_id uuid,
  payload jsonb,
  attempts smallint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
BEGIN
  PERFORM app_private.require_service_role();

  IF p_worker_id IS NULL OR length(btrim(p_worker_id)) NOT BETWEEN 3 AND 120
     OR p_limit NOT BETWEEN 1 AND 500
     OR p_lock_timeout < interval '1 minute'
     OR p_lock_timeout > interval '30 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_OUTBOX_CLAIM_ARGUMENTS';
  END IF;

  -- Recover abandoned leases before claiming new work.
  UPDATE public.outbox_events o
  SET status = 'failed', locked_at = NULL, locked_by = NULL,
      available_at = now(), last_error_code = 'lease_expired', updated_at = now()
  WHERE o.status = 'processing' AND o.locked_at < now() - p_lock_timeout;

  RETURN QUERY
  WITH candidates AS (
    SELECT o.id
    FROM public.outbox_events o
    WHERE o.status IN ('pending', 'failed')
      AND o.available_at <= now()
      AND o.attempts < 10
    ORDER BY o.available_at, o.created_at, o.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.outbox_events o
    SET status = 'processing', attempts = attempts + 1,
        locked_at = now(), locked_by = p_worker_id, updated_at = now()
    FROM candidates c
    WHERE o.id = c.id
    RETURNING o.id, o.event_type, o.aggregate_type, o.aggregate_id,
              o.market_id, o.payload, o.attempts
  )
  SELECT c.id, c.event_type, c.aggregate_type, c.aggregate_id,
         c.market_id, c.payload, c.attempts
  FROM claimed c;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_finish_outbox(
  p_event_id uuid,
  p_worker_id text,
  p_success boolean,
  p_error_code text DEFAULT NULL,
  p_retry_after interval DEFAULT interval '5 minutes'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_event public.outbox_events%ROWTYPE;
  v_status text;
BEGIN
  PERFORM app_private.require_service_role();

  SELECT * INTO v_event FROM public.outbox_events
  WHERE id = p_event_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'OUTBOX_EVENT_NOT_FOUND';
  END IF;

  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_replay', true);
  END IF;

  IF v_event.status <> 'processing' OR v_event.locked_by IS DISTINCT FROM p_worker_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'OUTBOX_LEASE_MISMATCH';
  END IF;

  IF p_success THEN
    UPDATE public.outbox_events
    SET status = 'completed', processed_at = now(),
        locked_at = NULL, locked_by = NULL, last_error_code = NULL,
        updated_at = now()
    WHERE id = v_event.id;
    v_status := 'completed';
  ELSE
    IF p_retry_after < interval '10 seconds' OR p_retry_after > interval '24 hours' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RETRY_DELAY';
    END IF;

    v_status := CASE WHEN v_event.attempts >= 10 THEN 'dead_letter' ELSE 'failed' END;
    UPDATE public.outbox_events
    SET status = v_status,
        available_at = CASE WHEN v_status = 'failed' THEN now() + p_retry_after ELSE available_at END,
        locked_at = NULL, locked_by = NULL,
        last_error_code = left(COALESCE(p_error_code, 'worker_error'), 120),
        updated_at = now()
    WHERE id = v_event.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'idempotent_replay', false, 'status', v_status);
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic, privacy-preserving rate-limit check. The trusted server supplies
-- SHA-256 hashes; raw IP/email/device identifiers never enter the table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_check_rate_limit(
  p_key_hash bytea,
  p_identifier_hash bytea,
  p_scope text,
  p_action text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_allowed boolean;
  v_remaining integer;
BEGIN
  PERFORM app_private.require_service_role();

  IF octet_length(p_key_hash) <> 32 OR octet_length(p_identifier_hash) <> 32
     OR p_scope NOT IN ('ip', 'user', 'device', 'shop', 'global')
     OR p_action IS NULL OR length(btrim(p_action)) NOT BETWEEN 2 AND 80
     OR p_limit NOT BETWEEN 1 AND 100000
     OR p_window_seconds NOT BETWEEN 1 AND 86400
     OR p_block_seconds NOT BETWEEN 0 AND 604800 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RATE_LIMIT_ARGUMENTS';
  END IF;

  INSERT INTO public.rate_limits (
    key_hash, scope, action, identifier_hash,
    request_count, window_start, window_end
  )
  VALUES (
    p_key_hash, p_scope, p_action, p_identifier_hash,
    1, v_now, v_now + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (key_hash) DO NOTHING
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', p_limit,
      'remaining', GREATEST(0, p_limit - 1),
      'reset_at', v_row.window_end,
      'blocked_until', NULL
    );
  END IF;

  SELECT * INTO v_row FROM public.rate_limits
  WHERE key_hash = p_key_hash FOR UPDATE;

  IF v_row.scope <> p_scope
     OR v_row.action <> p_action
     OR v_row.identifier_hash <> p_identifier_hash THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RATE_LIMIT_KEY_COLLISION';
  END IF;

  IF v_row.window_end <= v_now THEN
    UPDATE public.rate_limits
    SET request_count = 1, window_start = v_now,
        window_end = v_now + make_interval(secs => p_window_seconds),
        blocked_until = NULL, updated_at = v_now
    WHERE key_hash = p_key_hash
    RETURNING * INTO v_row;
    v_allowed := true;
  ELSIF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    v_allowed := false;
  ELSIF v_row.request_count >= p_limit THEN
    UPDATE public.rate_limits
    SET blocked_until = CASE
          WHEN p_block_seconds > 0 THEN v_now + make_interval(secs => p_block_seconds)
          ELSE window_end
        END,
        updated_at = v_now
    WHERE key_hash = p_key_hash
    RETURNING * INTO v_row;
    v_allowed := false;
  ELSE
    UPDATE public.rate_limits
    SET request_count = request_count + 1, updated_at = v_now
    WHERE key_hash = p_key_hash
    RETURNING * INTO v_row;
    v_allowed := true;
  END IF;

  v_remaining := GREATEST(0, p_limit - v_row.request_count);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'limit', p_limit,
    'remaining', v_remaining,
    'reset_at', v_row.window_end,
    'blocked_until', v_row.blocked_until
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Narrow administrative identity operations. Admin cannot promote users to
-- admin/super_admin or modify peer admins; only super_admin can do so.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_caller_id uuid := app_private.require_active_caller();
  v_caller_role text := app_private.user_role(v_caller_id);
  v_target_role text;
BEGIN
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  IF p_new_role NOT IN ('user', 'comercio', 'admin', 'super_admin')
     OR p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ROLE_CHANGE';
  END IF;

  SELECT role INTO v_target_role FROM public.user_profiles
  WHERE id = p_target_user_id AND account_status <> 'deleted' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'TARGET_USER_NOT_FOUND';
  END IF;

  IF v_caller_role = 'admin'
     AND (v_target_role IN ('admin', 'super_admin') OR p_new_role IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUPER_ADMIN_REQUIRED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.shops s WHERE s.owner_id = p_target_user_id)
     AND p_new_role <> 'comercio' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_OWNER_ROLE_CONFLICT';
  END IF;

  UPDATE public.user_profiles
  SET role = p_new_role, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.activity_logs (
    actor_user_id, actor_role, action, target_type, target_id, severity, metadata
  )
  VALUES (
    v_caller_id, v_caller_role, 'user.role_changed', 'user', p_target_user_id,
    'warning', jsonb_build_object('old_role', v_target_role, 'new_role', p_new_role)
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_target_user_id, 'role', p_new_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  p_target_user_id uuid,
  p_new_status text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_caller_id uuid := app_private.require_active_caller();
  v_caller_role text := app_private.user_role(v_caller_id);
  v_target_role text;
BEGIN
  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  IF p_new_status NOT IN ('active', 'suspended')
     OR p_reason IS NULL OR length(btrim(p_reason)) < 3
     OR p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ACCOUNT_STATUS_CHANGE';
  END IF;

  SELECT role INTO v_target_role FROM public.user_profiles
  WHERE id = p_target_user_id AND account_status <> 'deleted' FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'TARGET_USER_NOT_FOUND';
  END IF;

  IF v_caller_role = 'admin' AND v_target_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SUPER_ADMIN_REQUIRED';
  END IF;

  UPDATE public.user_profiles
  SET account_status = p_new_status, updated_at = now()
  WHERE id = p_target_user_id;

  INSERT INTO public.activity_logs (
    actor_user_id, actor_role, action, target_type, target_id, severity, metadata
  )
  VALUES (
    v_caller_id, v_caller_role, 'user.account_status_changed', 'user', p_target_user_id,
    'warning', jsonb_build_object('new_status', p_new_status, 'reason', btrim(p_reason))
  );

  RETURN jsonb_build_object(
    'success', true, 'user_id', p_target_user_id, 'account_status', p_new_status
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Legal acceptance, communication preferences, devices and shop hours.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_legal_document(
  p_legal_document_id uuid,
  p_app_platform text,
  p_app_version text,
  p_acceptance_context text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_user_market_id uuid;
  v_document_market_id uuid;
BEGIN
  SELECT market_id INTO v_user_market_id FROM public.user_profiles WHERE id = v_user_id;
  SELECT market_id INTO v_document_market_id
  FROM public.legal_documents
  WHERE id = p_legal_document_id
    AND status = 'published'
    AND effective_at <= now();

  IF NOT FOUND OR v_user_market_id IS DISTINCT FROM v_document_market_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LEGAL_DOCUMENT_NOT_APPLICABLE';
  END IF;

  INSERT INTO public.legal_acceptances (
    user_id, legal_document_id, app_platform, app_version, acceptance_context
  )
  VALUES (
    v_user_id, p_legal_document_id, p_app_platform,
    NULLIF(btrim(p_app_version), ''), p_acceptance_context
  )
  ON CONFLICT (user_id, legal_document_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'legal_document_id', p_legal_document_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_notification_preference(
  p_category text,
  p_channel text,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF p_category IN ('account_security', 'payment', 'reservation', 'pickup')
     AND p_channel = 'in_app' AND p_enabled = false THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'REQUIRED_IN_APP_NOTIFICATION';
  END IF;

  INSERT INTO public.notification_preferences (user_id, category, channel, enabled)
  VALUES (v_user_id, p_category, p_channel, p_enabled)
  ON CONFLICT (user_id, category, channel) DO UPDATE
    SET enabled = EXCLUDED.enabled, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'category', p_category, 'channel', p_channel, 'enabled', p_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_device(
  p_platform text,
  p_push_provider text,
  p_push_token text,
  p_app_version text,
  p_locale text,
  p_market_id uuid,
  p_device_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public, extensions
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_hash bytea;
  v_device_id uuid;
BEGIN
  IF p_push_token IS NULL OR length(p_push_token) NOT BETWEEN 16 AND 4096 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PUSH_TOKEN';
  END IF;

  IF p_market_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.markets m
    WHERE m.id = p_market_id AND m.status IN ('waitlist', 'pilot', 'active')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'MARKET_NOT_AVAILABLE';
  END IF;

  v_hash := extensions.digest(p_push_token, 'sha256');

  INSERT INTO public.user_devices (
    user_id, platform, push_provider, push_token, push_token_hash,
    app_version, locale, market_id, device_label,
    last_seen_at, revoked_at
  )
  VALUES (
    v_user_id, p_platform, p_push_provider, p_push_token, v_hash,
    NULLIF(btrim(p_app_version), ''), p_locale, p_market_id,
    NULLIF(btrim(p_device_label), ''), now(), NULL
  )
  ON CONFLICT (push_token_hash) DO UPDATE
    SET user_id = v_user_id,
        platform = EXCLUDED.platform,
        push_provider = EXCLUDED.push_provider,
        push_token = EXCLUDED.push_token,
        app_version = EXCLUDED.app_version,
        locale = EXCLUDED.locale,
        market_id = EXCLUDED.market_id,
        device_label = EXCLUDED.device_label,
        last_seen_at = now(),
        revoked_at = NULL,
        updated_at = now()
  RETURNING id INTO v_device_id;

  RETURN jsonb_build_object('success', true, 'device_id', v_device_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_device(p_device_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  UPDATE public.user_devices
  SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
  WHERE id = p_device_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'DEVICE_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object('success', true, 'device_id', p_device_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shop_hour(
  p_shop_id uuid,
  p_weekday smallint,
  p_sequence smallint,
  p_opens_at time,
  p_closes_at time,
  p_is_closed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF NOT app_private.owns_shop(v_user_id, p_shop_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_OWNED';
  END IF;

  INSERT INTO public.shop_hours (
    shop_id, weekday, sequence, opens_at, closes_at, is_closed
  )
  VALUES (
    p_shop_id, p_weekday, p_sequence,
    CASE WHEN p_is_closed THEN NULL ELSE p_opens_at END,
    CASE WHEN p_is_closed THEN NULL ELSE p_closes_at END,
    p_is_closed
  )
  ON CONFLICT (shop_id, weekday, sequence) DO UPDATE
    SET opens_at = EXCLUDED.opens_at,
        closes_at = EXCLUDED.closes_at,
        is_closed = EXCLUDED.is_closed,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id, 'weekday', p_weekday);
END;
$$;

-- No grants here. 0012_permissions.sql grants exact signatures only.

COMMIT;
