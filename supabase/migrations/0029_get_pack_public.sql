-- ============================================================================
-- PAPORLA — 0029_get_pack_public.sql
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- Public single-pack lookup by id, para la página /packs/[id].
--
-- PROBLEMA
-- search_available_packs (0014) solo expone packs RESERVABLES: stock > 0 y
-- ventana de recogida futura. Un pack agotado (reservaste el último) o con la
-- ventana ya pasada desaparecía de esa búsqueda y su página de detalle daba
-- 404 — incluso viniendo de "Ver detalles" de Mis reservas.
--
-- SOLUCIÓN
-- get_pack_public devuelve el pack por su id AUNQUE esté agotado o con la
-- ventana pasada, para que la página muestre el estado real ("Agotado" /
-- "Recogida finalizada", botones con su explicación) en vez de un 404.
--
-- Mismas reglas de visibilidad que el catálogo, menos los filtros de
-- disponibilidad:
--   * mercado pilot/active (los waitlist no se exponen)
--   * pack status 'active' y ventas ya abiertas (sales_start_at)
--   * comercio verificado y no borrado
-- Fuera de esas reglas devuelve un juego vacío y la página da 404.
--
-- SEGURIDAD
-- SECURITY DEFINER intencional (mismo patrón que get_public_shop, 0014 y
-- get_my_pack, 0023): por 0012, anon NO tiene SELECT directo sobre packs ni
-- shops; todas las reglas de visibilidad viven aquí, explícitas.
-- search_path fijado para evitar manipulación del search_path (advisor).
--
-- Esta migración solo AÑADE una función. No altera tablas, políticas ni
-- permisos existentes. Rollback:
--   DROP FUNCTION IF EXISTS public.get_pack_public(uuid);
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
    AND p.status = 'active'
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND s.status = 'verified'
    AND s.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_pack_public(uuid) IS
  'Devuelve el pack público por id (aunque esté agotado o con la ventana
  pasada) o un juego vacío. Necesaria para /packs/[id]: search_available_packs
  solo expone packs reservables y un pack agotado daba 404 en su detalle.';

REVOKE EXECUTE ON FUNCTION public.get_pack_public(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pack_public(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pack_public(uuid) TO anon, authenticated;

COMMIT;