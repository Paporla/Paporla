BEGIN;

-- ---------------------------------------------------------------------------
-- A-10: packs disponibles de UN comercio, con el stock total REAL.
--
-- La ficha pública de un comercio (useShop) pedía search_available_packs SIN
-- filtro de comercio y con p_limit 50 —el tope que admite esa función— para
-- después filtrar en el navegador por shop_id. En consecuencia, si había más
-- de 50 packs de OTROS comercios por delante, los packs propios quedaban
-- fuera del límite y la ficha mostraba "0 packs" en el escaparate de un
-- comercio que sí estaba vendiendo.
--
-- Además, la ficha fabricaba el stock total: `total_stock: Number(p.remaining_stock)`.
-- Es decir, presentaba el stock RESTANTE como si fuera el TOTAL, y la tarjeta
-- decía "Stock: 3/3" cuando en realidad el comercio había vendido 7 de 10.
-- total_stock es una columna real de public.packs (0004), así que el dato
-- existía: solo había que devolverlo.
--
-- Esta RPC filtra en la base (sin depender de un límite global) y expone
-- total_stock de verdad. La regla de visibilidad es exactamente la misma que
-- search_available_packs (0037) y get_pack_public (0030): comercio verificado
-- y vivo, mercado pilot/active, pack activo, con stock, a la venta ya
-- empezada y con la ventana de recogida todavía abierta (margen de 15 min).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_shop_packs(
  p_shop_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  pack_id uuid,
  title text,
  description text,
  category text,
  price_minor bigint,
  original_price_minor bigint,
  currency_code text,
  remaining_stock integer,
  total_stock integer,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone text,
  image_path text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_shop_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SHOP_PACKS_ARGUMENTS: p_shop_id es obligatorio'
      USING ERRCODE = '22023';
  END IF;

  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'INVALID_SHOP_PACKS_ARGUMENTS: p_limit debe estar entre 1 y 100'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    p.id                AS pack_id,
    p.title             AS title,
    p.description       AS description,
    p.category          AS category,
    p.price_minor       AS price_minor,
    p.original_price_minor AS original_price_minor,
    p.currency_code     AS currency_code,
    p.remaining_stock   AS remaining_stock,
    p.total_stock       AS total_stock,
    p.pickup_start_at   AS pickup_start_at,
    p.pickup_end_at     AS pickup_end_at,
    p.timezone_snapshot AS timezone,
    p.image_path        AS image_path
  FROM public.packs p
  JOIN public.shops s
    ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.markets m
    ON m.id = p.market_id AND m.status IN ('pilot', 'active')
  WHERE p.shop_id = p_shop_id
    AND p.status = 'active'
    AND p.remaining_stock > 0
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND p.pickup_end_at > now() + interval '15 minutes'
    AND s.status = 'verified'
    AND s.deleted_at IS NULL
  ORDER BY p.pickup_start_at ASC, p.id ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_shop_packs(uuid, integer) IS
  'A-10: packs disponibles de un comercio verificado, filtrados en la base (no en el cliente) y con el stock total real. Misma regla de disponibilidad que search_available_packs (0037).';

-- CREATE FUNCTION concede EXECUTE a PUBLIC por defecto: se revoca antes de
-- conceder, igual que en 0030/0047 (el test de seguridad 0016 lo vigila).
REVOKE EXECUTE ON FUNCTION public.list_shop_packs(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_shop_packs(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_shop_packs(uuid, integer) TO anon, authenticated;

COMMIT;