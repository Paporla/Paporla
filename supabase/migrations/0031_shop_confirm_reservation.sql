-- ============================================================================
-- PAPORLA — 0031_shop_confirm_reservation.sql
-- Piloto sin pagos: el comercio confirma a mano una reserva payment_pending.
-- Con una sola transición emula la cadena que haría el webhook de pagos
-- (authorized -> captured -> ventana abierta) y emite el código de recogida
-- del cliente más un token para el QR futuro.
--
-- El código se muestra UNA SOLA VEZ: en la base solo se guarda su huella
-- SHA-256 (reservations.pickup_code_hash), igual que hace
-- service_issue_pickup_credentials (0009:874). La restricción de 0005
-- (reservations_credential_pair_check) exige AMBOS hashes juntos, por eso se
-- emiten código y token en el mismo UPDATE.
--
-- Ejecutar en el SQL Editor del proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.confirm_shop_reservation(p_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public, extensions
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
  v_res public.reservations%ROWTYPE;
  v_code text;
  v_token text;
  v_now timestamptz := now();
BEGIN
  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'RESERVATION_ID_REQUIRED';
  END IF;

  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  IF NOT app_private.owns_shop(v_user_id, v_res.shop_id)
     AND NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'NOT_AUTHORIZED_FOR_RESERVATION';
  END IF;

  -- Idempotencia: ya está confirmada (doble clic o reconfirmar más tarde).
  -- Si el código ya fue emitido no se puede volver a mostrar (solo se
  -- guarda su huella); se comunica en `note`.
  IF v_res.status IN ('confirmed', 'ready_pickup')
     AND v_res.payment_status IN ('authorized', 'capture_pending', 'paid') THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'reservation_id', v_res.id,
      'status', v_res.status,
      'payment_status', v_res.payment_status,
      'pickup_code', NULL,
      'note', CASE
        WHEN v_res.pickup_code_hash IS NOT NULL
        THEN 'El codigo ya fue emitido y solo se muestra una vez (se guarda su huella).'
        ELSE 'Reserva confirmada; el codigo se emitira cuando abra la ventana de recogida.'
      END
    );
  END IF;

  IF v_res.status <> 'payment_pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_CONFIRMABLE';
  END IF;

  -- Piloto: el comercio confirma a mano y emula la cadena
  -- authorized -> captured -> window_open -> issue_credentials.
  -- Código: 'P4P-' + 8 hex (12 caracteres; pasa el check 8..512 de
  -- validate_pickup; en hex no hay O/I/L que se parezcan). Token: 32 hex
  -- para el QR futuro; NUNCA se devuelve al cliente.
  v_code := 'P4P-' || upper(substr(md5(random()::text), 1, 8));
  v_token := md5(random()::text);

  UPDATE public.reservations
  SET
    status = 'ready_pickup',
    payment_status = 'paid',
    confirmed_at = COALESCE(confirmed_at, v_now),
    ready_at = v_now,
    pickup_code_hash = extensions.digest(v_code, 'sha256'),
    pickup_token_hash = extensions.digest(v_token, 'sha256'),
    pickup_credential_version = 1,
    pickup_credential_issued_at = v_now,
    updated_at = v_now
  WHERE id = v_res.id;

  PERFORM app_private.enqueue_event(
    'reservation.confirmed', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':confirmed',
    jsonb_build_object('reservation_id', v_res.id, 'actor_role', v_role), v_now
  );
  PERFORM app_private.enqueue_event(
    'reservation.pickup_window_opened', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':pickup_window_opened',
    jsonb_build_object('reservation_id', v_res.id), v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'reservation_id', v_res.id,
    'status', 'ready_pickup',
    'payment_status', 'paid',
    'pickup_code', v_code
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_shop_reservation(uuid) IS
  'Piloto sin pagos: el comercio confirma una reserva payment_pending, la pasa a ready_pickup con payment_status=paid y emite codigo+token de recogida (solo se guardan sus huellas sha256; el codigo crudo se devuelve una unica vez).';

REVOKE EXECUTE ON FUNCTION public.confirm_shop_reservation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_shop_reservation(uuid) TO authenticated;

COMMIT;
