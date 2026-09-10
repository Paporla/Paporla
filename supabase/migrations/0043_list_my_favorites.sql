-- ============================================================================
-- 0043 · list_my_favorites — lectura de favoritos por RPC (Lote F1).
--
-- HISTORIA (L-06 / auditoría 2026-09-09 / Sentry issue f2f74c07): los
-- favoritos estaban muertos en runtime. El hook useFavorites consultaba la
-- tabla favorites directamente y hacía join a shops pidiendo columnas que no
-- existen (city, verified, rating, logo_url...). authenticated no tiene
-- GRANT directo sobre esas tablas —a propósito: todo pasa por funciones
-- SECURITY DEFINER—, así que cada operación fallaba con 42501 y el error se
-- tragaba en silencio: el corazón no hacía nada.
--
-- La escritura YA tenía camino correcto: public.set_favorite (0009) con su
-- GRANT (0012). Esta migración crea la lectura que faltaba; el hook se
-- reescribe para usar ambas RPC y nada más.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_my_favorites()
RETURNS TABLE (
  favorite_id text,
  shop_id uuid,
  favorited_at timestamptz,
  name text,
  category text,
  locality_name text,
  address text,
  phone_e164 text,
  verified boolean,
  rating numeric,
  rating_count integer,
  logo_path text,
  cover_path text,
  shop_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
BEGIN
  -- Favoritos es una función de comprador. A otros roles se les devuelve la
  -- lista vacía en vez de una excepción: el corazón que puedan ver en una
  -- ficha pública debe quedarse inerte, no reventarles la página.
  IF v_role <> 'user' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (f.user_id::text || ':' || f.shop_id::text) AS favorite_id,
    f.shop_id,
    f.created_at,
    s.name,
    s.category,
    l.name AS locality_name,
    NULLIF(concat_ws(', ', s.address_line1, s.address_line2), '') AS address,
    s.phone_e164,
    (s.status = 'verified') AS verified,
    CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END AS rating,
    COALESCE(ss.rating_count, 0)::integer AS rating_count,
    s.logo_path,
    s.cover_path,
    s.status AS shop_status
  FROM public.favorites f
  JOIN public.shops s ON s.id = f.shop_id AND s.deleted_at IS NULL
  LEFT JOIN public.localities l ON l.id = s.locality_id
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE f.user_id = v_user_id
  ORDER BY f.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.list_my_favorites() IS
  'Favoritos del comprador activo con los datos públicos de cada comercio. Para otros roles devuelve lista vacía. Lectura oficial de favoritos: la tabla no se toca directo.';

GRANT EXECUTE ON FUNCTION public.list_my_favorites() TO authenticated;