-- ============================================================================
-- PAPORLA — 0016_lint_fixes.sql
-- Staging corrective migration after PostgreSQL/plpgsql_check validation.
-- Fixes one ambiguous column error and two unused lock-only variables.
-- ============================================================================

BEGIN;

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

  PERFORM p.id FROM public.packs p WHERE p.id = v_res.pack_id FOR UPDATE;

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

CREATE OR REPLACE FUNCTION public.archive_pack(p_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  PERFORM p.id
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
    SET status = 'processing', attempts = o.attempts + 1,
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

COMMIT;
