-- ============================================================================
-- PAPORLA — 0050_list_my_reservations_savings.sql
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
--              ⚠️ CONFIRMA ANTES en el panel de Supabase que ese ref es el de
--              staging y no el de producción.
--
-- QUÉ HACE: añade unit_price_minor, quantity y original_price_minor a
--           list_my_reservations, para que el panel del usuario pueda calcular
--           el AHORRO REAL en vez de mostrar el precio del pack.
--
-- POR QUÉ (auditoría externa A-05):
--   La tarjeta "Ahorrado" del panel sumaba `total_amount_minor`, que es el
--   PRECIO DEL PACK, no el descuento. Era una cifra que no era lo que decía
--   ser: no es ahorro, es gasto.
--
--   Y había una contradicción peor: la landing (community_stats, 0035) SÍ
--   calculaba el ahorro bien — `GREATEST(p.original_price_minor -
--   r.unit_price_minor, 0) * r.quantity` — mientras el panel hacía otra cuenta
--   distinta. Dos definiciones de "ahorro" en la misma app: al menos una
--   mentía. Con esta migración las dos pantallas usan los mismos datos.
--
--   El panel NO podía arreglarse solo: list_my_reservations no devolvía ni el
--   precio pagado por unidad ni el precio original. Faltaba el dato.
--
-- DISEÑO:
--   * unit_price_minor y quantity salen de la propia reserva (snapshots de
--     0014: son históricos, no cambian si el pack se edita después).
--   * original_price_minor sale de packs por LEFT JOIN, y puede ser NULL:
--     un pack puede no tener precio original declarado, o haber sido borrado.
--     NULL significa "ahorro 0 para esta reserva", que es lo que ya hace
--     community_stats con COALESCE(...,0).
--   * LEFT JOIN (no INNER) para que la lista nunca pierda filas.
--
-- DESPLIEGUE SEGURO: el frontend degrada con elegancia. Si esta migración no
-- está aplicada, esas tres columnas no existen en la respuesta y el panel
-- muestra "Valor de tus packs" (una etiqueta cierta para la cifra que sí
-- tiene) en vez de un $0 falso. Puedes subir el código antes o después de
-- correr esto: ningún orden rompe nada.
--
-- DROP FUNCTION + CREATE (no solo CREATE OR REPLACE): Postgres prohíbe cambiar
-- el tipo de retorno de una función en el lugar (error 42P13). El DROP y el
-- CREATE corren en la MISMA transacción, así que para los clientes existe la
-- función vieja o la nueva, nunca un hueco.
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
  shop_longitude double precision,
  -- 0050 (A-05): datos para el ahorro real del panel del usuario.
  unit_price_minor bigint,
  quantity integer,
  original_price_minor bigint
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
         p.image_path, r.updated_at, s.latitude, s.longitude,
         r.unit_price_minor, r.quantity, p.original_price_minor
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
  'Lista canónica de reservas del usuario (0014) enriquecida con foto del pack,
  último cambio de estado y coordenadas del comercio (0028) y con los datos de
  precio pagado y precio original (0050) para calcular el ahorro real del panel.';

GRANT EXECUTE ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) TO authenticated;

COMMIT;