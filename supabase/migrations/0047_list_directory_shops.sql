BEGIN;

CREATE OR REPLACE FUNCTION public.list_directory_shops(
  p_market_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  shop_id uuid,
  name text,
  description text,
  locality_name text,
  logo_path text,
  cover_path text,
  rating numeric,
  rating_count integer,
  has_available_packs boolean,
  available_pack_count integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_market_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DIRECTORY_SHOPS_ARGUMENTS: p_market_id es obligatorio'
      USING ERRCODE = '22023';
  END IF;

  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'INVALID_DIRECTORY_SHOPS_ARGUMENTS: p_limit debe estar entre 1 y 100'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    s.id                AS shop_id,
    s.name              AS name,
    s.description       AS description,
    l.name              AS locality_name,
    s.logo_path         AS logo_path,
    s.cover_path        AS cover_path,
    CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END                 AS rating,
    COALESCE(ss.rating_count, 0)::integer AS rating_count,
    COALESCE(av.n, 0) > 0                 AS has_available_packs,
    COALESCE(av.n, 0)                     AS available_pack_count,
    s.updated_at        AS updated_at
  FROM public.shops s
  JOIN public.markets m
    ON m.id = s.market_id AND m.status IN ('pilot', 'active')
  LEFT JOIN public.localities l
    ON l.id = s.locality_id AND l.market_id = s.market_id
  LEFT JOIN public.shop_stats ss
    ON ss.shop_id = s.id
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS n
    FROM public.packs p
    WHERE p.shop_id = s.id
      AND p.market_id = s.market_id
      AND p.status = 'active'
      AND p.remaining_stock > 0
      AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
      AND p.pickup_end_at > now() + interval '15 minutes'
  ) av ON true
  WHERE s.market_id = p_market_id
    AND s.status = 'verified'
    AND s.deleted_at IS NULL
  ORDER BY has_available_packs DESC, name ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_directory_shops(uuid, integer) IS
  'L-42 (Lote Escaparate): directorio completo de comercios verificados vivos del mercado, con indicador de packs disponibles (misma regla que 0037). Orden: con packs primero, luego alfabético.';

REVOKE EXECUTE ON FUNCTION public.list_directory_shops(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_directory_shops(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_directory_shops(uuid, integer) TO anon, authenticated;

COMMIT;