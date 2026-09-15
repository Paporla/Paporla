-- ============================================================================
-- PAPORLA — 0048_shop_mark_picked_up.sql
-- L-64 (Camino 1, decisión del fundador 2026-09-15): el comercio puede marcar
-- una reserva como ENTREGADA sin necesidad del código de recogida.
--
-- POR QUÉ HACE FALTA.
--   El único camino que tenía el comercio para cerrar una entrega era
--   validate_pickup(0009:503), que exige escribir la credencial del cliente
--   ('P4P-' + 8 hex, o el token del QR futuro). Pero el cliente no tiene forma
--   de conseguirla:
--     * confirm_shop_reservation (0031:82) genera el código y lo devuelve AL
--       COMERCIO una sola vez;
--     * en la base solo queda su huella SHA-256 (reservations.pickup_code_hash,
--       0005:34 y 0031:91), así que ni la app puede volver a mostrarlo;
--     * no hay ninguna pantalla del cliente que lo pinte;
--     * los correos que lo llevaban (lib/email) están bloqueados hasta tener
--       empresa + MercadoPago (decisión del fundador).
--   Resultado: en el piloto la entrega solo podía cerrarse "a mano", pasando el
--   código por teléfono o dejándola colgada hasta que el cron la marcara
--   no_show. Con el botón "Entregado" el comercio cierra la entrega buscando la
--   reserva por el nombre del cliente, que ya ve en su listado
--   (list_shop_reservations devuelve customer_display_name).
--
-- QUÉ NO CAMBIA.
--   * validate_pickup sigue existiendo y sigue siendo el camino con
--     credencial. Las dos vías llevan al mismo estado final.
--   * El código sigue sin mostrarse al cliente: sigue estando bloqueado hasta
--     el Bloque F. Esta función no lo lee ni lo devuelve.
--   * pickup_credential_used_at se queda NULL a propósito: ese campo significa
--     "se presentó una credencial", y aquí no se presentó ninguna. La
--     restricción de 0005:150 solo exige que, si está relleno, picked_up_at
--     también lo esté; al revés no obliga a nada.
--
-- REGLAS DE LA FUNCIÓN (calcadas de validate_pickup salvo donde se dice).
--   1. Solo el comercio dueño de la reserva, o un admin.
--   2. Idempotente: si ya está entregada, devuelve success con
--      idempotent_replay = true y no vuelve a escribir (mismo patrón que
--      confirm_shop_reservation, 0031). Un doble clic no duplica el evento.
--   3. Solo desde ready_pickup con payment_status = 'paid', que es el estado en
--      el que deja la reserva confirm_shop_reservation en el piloto.
--   4. Tope superior: pickup_end_at + 30 minutos, IGUAL que validate_pickup.
--      Pasado ese punto la reserva ya no es entregable: el cron
--      service_mark_no_shows la marcará como no retirada, y permitirlo aquí
--      abriría la puerta a maquillar cifras después del hecho.
--   5. SIN tope inferior (distinto de validate_pickup, que exige estar dentro
--      de la ventana). DECISIÓN EXPLÍCITA: la franja es una promesa AL CLIENTE
--      sobre cuándo puede pasar, no una prohibición para el comercio. Si el
--      cliente aparece antes y el comercio le da el pack, la entrega es real y
--      debe poder registrarse. El pack ya estaba preparado y el comercio es el
--      dueño de la reserva: no hay dinero en juego (piloto sin cobro) ni dato
--      ajeno que proteger. Si el fundador prefiere la ventana exacta, es añadir
--      un IF con 'OUTSIDE_PICKUP_WINDOW' y listo.
--
-- Convención 0041: SECURITY DEFINER con search_path fijo + REVOKE FROM PUBLIC.
-- Sin pgcrypto en el search_path: esta función no firma nada, no lo necesita.
--
-- Ejecutar en el SQL Editor del proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.shop_mark_picked_up(p_reservation_id uuid)
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
  v_now timestamptz := now();
BEGIN
  IF v_role <> 'comercio' AND NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MERCHANT_OR_ADMIN_REQUIRED';
  END IF;

  IF p_reservation_id IS NULL THEN
    RAISE EXCEPTION 'PICKUP_ARGUMENTS_INVALID: p_reservation_id es obligatorio'
      USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'RESERVATION_NOT_FOUND';
  END IF;

  IF v_role = 'comercio' AND NOT app_private.owns_shop(v_user_id, v_res.shop_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WRONG_SHOP';
  END IF;

  -- Idempotencia: ya entregada (doble clic, o el comercio que vuelve a entrar).
  IF v_res.status IN ('picked_up', 'completed') THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'reservation_id', v_res.id,
      'status', v_res.status,
      'note', 'Esta reserva ya estaba marcada como entregada.'
    );
  END IF;

  IF v_res.status <> 'ready_pickup' OR v_res.payment_status <> 'paid' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_READY';
  END IF;

  IF v_now > v_res.pickup_end_at + interval '30 minutes' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'OUTSIDE_PICKUP_WINDOW';
  END IF;

  UPDATE public.reservations
  SET
    status = 'picked_up',
    picked_up_at = v_now,
    updated_at = v_now
  WHERE id = v_res.id;

  -- Mismo evento que emite validate_pickup, con el origen marcado para que el
  -- feed de actividad del admin (L-21, pendiente) pueda distinguir las dos vías.
  PERFORM app_private.enqueue_event(
    'reservation.picked_up', 'reservation', v_res.id, v_res.market_id,
    'reservation:' || v_res.id || ':picked_up',
    jsonb_build_object(
      'reservation_id', v_res.id,
      'shop_id', v_res.shop_id,
      'method', 'shop_manual'
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'reservation_id', v_res.id,
    'status', 'picked_up',
    'pack_title', v_res.pack_title_snapshot,
    'quantity', v_res.quantity
  );
END;
$$;

COMMENT ON FUNCTION public.shop_mark_picked_up(uuid) IS
  'L-64 Camino 1: el comercio marca una reserva suya como entregada sin credencial. Mismo estado final que validate_pickup (0009:503), que sigue siendo el camino con código. Idempotente; solo desde ready_pickup+paid y hasta pickup_end_at + 30 min.';

REVOKE EXECUTE ON FUNCTION public.shop_mark_picked_up(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shop_mark_picked_up(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.shop_mark_picked_up(uuid) TO authenticated;

COMMIT;