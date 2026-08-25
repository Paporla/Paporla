-- ============================================================================
-- PAPORLA — 0030_fix_get_pack_public_sold_out.sql
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- Fix de 0029 (get_pack_public).
--
-- PROBLEMA
-- create_payment_reservation (0009) cambia el estado del pack a 'sold_out'
-- cuando el stock llega a 0:
--
--   status = CASE WHEN remaining_stock - 1 = 0 THEN 'sold_out' ELSE status END
--
-- get_pack_public (0029) exigía p.status = 'active', así que un pack agotado
-- devolvía un juego vacío y /packs/[id] seguía dando 404 — justo el caso que
-- esta función existe para mostrar ("Agotado" con explicación).
--
-- SOLUCIÓN
-- Exponer los packs 'active' y 'sold_out' (los dos estados con sentido
-- público para la página de detalle). No se incluye 'expired': ese estado lo
-- aplica el cron de expiración (fase 7) y su visibilidad pública se decide
-- junto con ese trabajo.
--
-- CREATE OR REPLACE: misma firma que 0029, solo cambia el WHERE. Los GRANT
-- ya existían; se repiten para que el archivo sea autocontenido.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_pack_public(p_pack_id uuid)
RETURNS TABLE (
  pack_id uuid,
  shop_id uuid,
  title text,
  description text,
  category text,
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
  locality_name text,
  shop_address text,
  shop_rating numeric
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    p.id,
    p.shop_id,
    p.title,
    p.description,
    p.category,
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
    l.name,
    NULLIF(concat_ws(', ', s.address_line1, s.address_line2), ''),
    CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.markets m ON m.id = p.market_id
  JOIN public.localities l ON l.id = s.locality_id AND l.market_id = p.market_id
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE p.id = p_pack_id
    AND m.status IN ('pilot', 'active')
    AND p.status IN ('active', 'sold_out')
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND s.status = 'verified'
    AND s.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_pack_public(uuid) IS
  'Devuelve el pack público por id aunque esté AGOTADO (status sold_out) o con
  la ventana pasada, o un juego vacío. Necesaria para /packs/[id]:
  search_available_packs solo expone packs reservables. (0029, corregido por
  0030: create_payment_reservation pasa el pack a sold_out cuando el stock
  llega a 0.)';

REVOKE EXECUTE ON FUNCTION public.get_pack_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pack_public(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pack_public(uuid) TO anon, authenticated;

COMMIT;