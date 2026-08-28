-- ============================================================================
-- PAPORLA — 0035_public_seo_rpc.sql
-- Fase 8 — SEO, búsqueda y analítica (28-ago).
--
-- Tres RPCs públicas de SOLO LECTURA para la superficie pública que el esquema
-- 0012 cierra a lecturas directas (42501 a anon/authenticated sobre
-- reservations/shops/packs):
--
--   1. community_stats()       -> métricas de la landing (api/stats).
--   2. list_public_shops()     -> páginas /shops/[id] del sitemap.
--   3. list_public_packs()     -> páginas /packs/[id] del sitemap (por mercado).
--
-- SEGURIDAD: SECURITY DEFINER intencional (anon NO tiene SELECT directo sobre
-- esas tablas: 0012). Solo se exponen agregados o id+updated_at: ninguna fila
-- de negocio viaja al cliente. GRANT exacto: anon + authenticated, mismo
-- patrón que las RPCs públicas de 0014:469-475.
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- Idempotente (CREATE OR REPLACE, misma firma que las futuras).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Métricas de la comunidad para la landing (GET /api/stats).
--    Rescatados = reservas picked_up/completed (estados finales de recogida);
--    ahorro = (precio original - precio pagado) por unidad, solo si es
--    positivo; moneda de la última reserva rescatada (o 'CLP' si no hay).
--    Solo agregados: no expone filas de negocio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.community_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rescued bigint;
  v_saved bigint;
  v_currency text;
  v_shops integer;
  v_packs integer;
BEGIN
  SELECT count(*),
         COALESCE(sum(GREATEST(COALESCE(p.original_price_minor, 0) - r.unit_price_minor, 0) * r.quantity), 0),
         COALESCE((array_agg(r.currency_code ORDER BY r.picked_up_at DESC NULLS LAST))[1], 'CLP')
    INTO v_rescued, v_saved, v_currency
  FROM public.reservations r
  JOIN public.packs p ON p.id = r.pack_id
  WHERE r.status IN ('picked_up', 'completed');

  SELECT count(*)
    INTO v_shops
  FROM public.shops s
  WHERE s.status = 'verified'
    AND s.deleted_at IS NULL;

  SELECT count(*)
    INTO v_packs
  FROM public.packs p
  WHERE p.status = 'active'
    AND p.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'packs_rescued', COALESCE(v_rescued, 0),
    'money_saved_minor', COALESCE(v_saved, 0),
    'currency_code', COALESCE(v_currency, 'CLP'),
    'active_shops', COALESCE(v_shops, 0),
    'active_packs', COALESCE(v_packs, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.community_stats() IS 'F8: métricas públicas de la comunidad (api/stats): agregados de rescatados, ahorro en unidad menor y contadores activos. SECURITY DEFINER: anon no tiene SELECT directo (0012).';

REVOKE EXECUTE ON FUNCTION public.community_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.community_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.community_stats() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Comercios verificados vivos, para el sitemap (solo id, nombre y
--    updated_at; orden y limit para paginación futura).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_public_shops(p_limit integer DEFAULT 100)
RETURNS TABLE (
  shop_id uuid,
  name text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'INVALID_PUBLIC_SHOPS_PAGE_ARGUMENTS: p_limit debe estar entre 1 y 100'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.updated_at
  FROM public.shops s
  WHERE s.status = 'verified'
    AND s.deleted_at IS NULL
  ORDER BY s.updated_at DESC, s.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_public_shops(integer) IS 'F8: listado mínimo de comercios verificados vivos para el sitemap (id, name, updated_at).';

REVOKE EXECUTE ON FUNCTION public.list_public_shops(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_public_shops(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_public_shops(integer) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Packs con página pública, por mercado, para el sitemap. Mismas reglas de
--    visibilidad que get_pack_public (0030): mercado pilot/active, pack
--    active|sold_out, venta iniciada y comercio verified vivo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_public_packs(p_market_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE (
  pack_id uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_market_id IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'INVALID_PUBLIC_PACKS_PAGE_ARGUMENTS: p_market_id obligatorio y p_limit entre 1 y 50'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT p.id, p.updated_at
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.markets m ON m.id = p.market_id
  WHERE p.market_id = p_market_id
    AND m.status IN ('pilot', 'active')
    AND p.status IN ('active', 'sold_out')
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND s.status = 'verified'
    AND s.deleted_at IS NULL
  ORDER BY p.updated_at DESC, p.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_public_packs(uuid, integer) IS 'F8: packs con página pública por mercado para el sitemap (id, updated_at); visibilidad igual que get_pack_public (0030).';

REVOKE EXECUTE ON FUNCTION public.list_public_packs(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_public_packs(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_public_packs(uuid, integer) TO anon, authenticated;

COMMIT;
