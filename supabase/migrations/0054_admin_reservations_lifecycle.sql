-- ============================================================================
-- 0054 - ADMIN-1b / L-67: ciclo de vida de reservas en el panel admin.
--
-- El fundador pidio (2026-09-21) que la ficha de reserva muestre CUANDO y
-- POR QUE se cancelo, y a QUE HORA retiro el usuario. La base YA guarda y
-- ya exigia estos campos desde 0005 (CHECKs de coherencia por estado):
--   cancel_reason / cancelled_at -> cancel_reservation       (0009:465-466)
--   ready_at                     -> service_open_pickup_windows (0009:1006)
--   picked_up_at                 -> validate_pickup           (0009:556)
--   completed_at                 -> service_complete_picked_up_reservations (0009:1117)
--
-- list_admin_reservations (0032) no los devolvia, asi que el panel no podia
-- mostrarlos. Esta migracion agrega las 5 columnas al retorno. NO toca
-- tablas ni hace backfill: los CHECK de 0005 garantizan que las filas
-- relevantes ya traen los timestamps rellenos.
--
-- OJO: cambia el TIPO de retorno de la funcion, y PostgreSQL no permite eso
-- con CREATE OR REPLACE: toca DROP + CREATE (dentro de esta misma migracion).
-- Los permisos se vuelven a dejar exactamente como los fijo 0041.
-- ============================================================================

DROP FUNCTION IF EXISTS public.list_admin_reservations(integer);

CREATE OR REPLACE FUNCTION public.list_admin_reservations(
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  reservation_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  shop_id uuid,
  shop_name text,
  shop_address text,
  pack_title text,
  total_amount_minor bigint,
  currency_code text,
  status text,
  payment_status text,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone_snapshot text,
  created_at timestamptz,
  updated_at timestamptz,
  cancel_reason text,
  cancelled_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ADMIN_RESERVATIONS_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, up.display_name, up.email,
         r.shop_id, r.shop_name_snapshot, r.shop_address_snapshot,
         r.pack_title_snapshot, r.total_amount_minor, r.currency_code,
         r.status, r.payment_status,
         r.pickup_start_at, r.pickup_end_at, r.timezone_snapshot,
         r.created_at, r.updated_at,
         r.cancel_reason, r.cancelled_at, r.ready_at, r.picked_up_at,
         r.completed_at
  FROM public.reservations r
  LEFT JOIN public.user_profiles up ON up.id = r.user_id
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_admin_reservations(integer) IS
  'Panel admin (0032, extendida en 0054 / ADMIN-1b): lista canonica de reservas con usuario, snapshots y ciclo de vida (motivo/fecha de cancelacion, ready_at, picked_up_at, completed_at). Solo admin (is_admin); p_limit 1..500.';

-- Mismos permisos que 0041 dejo fijados para esta funcion.
REVOKE EXECUTE ON FUNCTION public.list_admin_reservations(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_reservations(integer) TO authenticated;
