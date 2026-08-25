-- ============================================================================
-- PAPORLA — 0028_enrich_list_my_reservations.sql
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- Enriquece list_my_reservations (0014:281) con 4 campos para el dashboard.
--
-- POR QUÉ (la tarjeta "Próxima recogida" y "Actividad reciente" muestran
-- datos reales de la reserva, no solo los snapshots):
--   * image_path        — foto del pack para mostrar en la tarjeta.
--   * updated_at        — último cambio de estado de la reserva. Igual a
--                         created_at mientras no cambia; en una cancelada,
--                         el momento exacto de la cancelación. "Hace X" se
--                         cuenta desde el evento, no desde la reserva.
--   * shop_latitude /
--   * shop_longitude    — coordenadas del comercio, para que "Cómo llegar"
--                         apunte al punto exacto en Google Maps (sin
--                         coordenadas interpreta el texto de la dirección,
--                         que puede ser ambiguo: "Calle 59a" existe en
--                         muchas ciudades y puede caer en otra).
--
-- Las reservas SIEMPRE usan snapshots de título/comercio/dirección (diseño
-- de 0014): estos 4 campos vienen de LEFT JOIN a packs/shops. LEFT JOIN para
-- que la lista nunca se pierda aunque falte la fila, y sin filtrar por
-- estado (las reservas del usuario se ven siempre, estés agotado o no).
--
-- DROP FUNCTION + CREATE (no solo CREATE OR REPLACE): Postgres prohíbe
-- cambiar el tipo de retorno de una función (sus columnas devueltas) en el
-- lugar con CREATE OR REPLACE — error 42P13. El DROP y el CREATE corren en
-- la MISMA transacción: para los clientes existe la función vieja o la
-- nueva, nunca un hueco. El GRANT a authenticated se re-emite en la misma
-- transacción, así que nadie pierde permisos.
-- ============================================================================

BEGIN;

DROP FUNCTION public.list_my_reservations(timestamp with time zone, uuid, integer);

CREATE OR REPLACE FUNCTION public.list_my_reservations(
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_reservation_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  reservation_id uuid,
  shop_id uuid,
  pack_id uuid,
  pack_title text,
  shop_name text,
  shop_address text,
  status text,
  payment_status text,
  total_amount_minor bigint,
  currency_code text,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone text,
  cancel_reason text,
  created_at timestamptz,
  image_path text,
  updated_at timestamptz,
  shop_latitude double precision,
  shop_longitude double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF p_limit NOT BETWEEN 1 AND 50
     OR (p_before_created_at IS NULL) <> (p_before_reservation_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_RESERVATION_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT r.id, r.shop_id, r.pack_id, r.pack_title_snapshot,
         r.shop_name_snapshot, r.shop_address_snapshot,
         r.status, r.payment_status, r.total_amount_minor, r.currency_code,
         r.pickup_start_at, r.pickup_end_at, r.timezone_snapshot,
         r.cancel_reason, r.created_at,
         p.image_path, r.updated_at, s.latitude, s.longitude
  FROM public.reservations r
  LEFT JOIN public.packs p ON p.id = r.pack_id
  LEFT JOIN public.shops s ON s.id = r.shop_id
  WHERE r.user_id = v_user_id
    AND (
      p_before_created_at IS NULL
      OR (r.created_at, r.id) < (p_before_created_at, p_before_reservation_id)
    )
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) IS
  'Lista canónica de reservas del usuario (0014) enriquecida con foto del
  pack, último cambio de estado y coordenadas del comercio (0028) para el
  dashboard.';

GRANT EXECUTE ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) TO authenticated;

COMMIT;