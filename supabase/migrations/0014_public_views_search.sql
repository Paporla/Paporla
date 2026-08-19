-- ============================================================================
-- PAPORLA — 0014_public_views_search.sql
-- Fresh-project migration. DO NOT run against the current project yet.
-- Safe, column-minimized catalogue and authenticated read RPCs.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Public/mobile pack search. SECURITY DEFINER is intentional: anon receives no
-- direct SELECT on shops/packs. Every lifecycle/visibility rule is explicit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_available_packs(
  p_market_id uuid,
  p_locality_id uuid DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_radius_meters integer DEFAULT 10000,
  p_query text DEFAULT NULL,
  p_cursor_pickup_start_at timestamptz DEFAULT NULL,
  p_cursor_pack_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  pack_id uuid,
  shop_id uuid,
  locality_id uuid,
  title text,
  description text,
  category text,
  tags text[],
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
  shop_category text,
  locality_name text,
  shop_address text,
  shop_latitude double precision,
  shop_longitude double precision,
  shop_rating numeric,
  shop_rating_count integer,
  distance_meters double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_origin extensions.geography;
  v_query text := NULLIF(btrim(p_query), '');
BEGIN
  IF p_market_id IS NULL OR p_limit NOT BETWEEN 1 AND 50
     OR p_radius_meters NOT BETWEEN 500 AND 100000
     OR (p_latitude IS NULL) <> (p_longitude IS NULL)
     OR (p_latitude IS NOT NULL AND p_latitude NOT BETWEEN -90 AND 90)
     OR (p_longitude IS NOT NULL AND p_longitude NOT BETWEEN -180 AND 180)
     OR (v_query IS NOT NULL AND length(v_query) > 100)
     OR (p_cursor_pickup_start_at IS NULL) <> (p_cursor_pack_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SEARCH_ARGUMENTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.markets m
    WHERE m.id = p_market_id AND m.status IN ('pilot', 'active')
  ) THEN
    RETURN;
  END IF;

  IF p_locality_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.localities l
    WHERE l.id = p_locality_id AND l.market_id = p_market_id AND l.is_active = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_MISMATCH';
  END IF;

  IF p_latitude IS NOT NULL THEN
    v_origin := extensions.ST_SetSRID(
      extensions.ST_MakePoint(p_longitude, p_latitude), 4326
    )::extensions.geography;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.shop_id,
    s.locality_id,
    p.title,
    p.description,
    p.category,
    p.tags,
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
    s.category,
    l.name,
    NULLIF(concat_ws(', ', s.address_line1, s.address_line2), ''),
    s.latitude,
    s.longitude,
    CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END,
    COALESCE(ss.rating_count, 0),
    CASE
      WHEN v_origin IS NULL OR s.geog IS NULL THEN NULL
      ELSE extensions.ST_Distance(s.geog, v_origin)
    END
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id AND s.market_id = p.market_id
  JOIN public.localities l ON l.id = s.locality_id AND l.market_id = s.market_id
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE p.market_id = p_market_id
    AND (p_locality_id IS NULL OR s.locality_id = p_locality_id)
    AND p.status = 'active'
    AND p.remaining_stock > 0
    AND (p.sales_start_at IS NULL OR p.sales_start_at <= now())
    AND p.pickup_start_at > now()
    AND s.status = 'verified'
    AND s.deleted_at IS NULL
    AND (v_origin IS NULL OR (s.geog IS NOT NULL AND extensions.ST_DWithin(s.geog, v_origin, p_radius_meters)))
    AND (
      v_query IS NULL
      OR p.title ILIKE '%' || v_query || '%'
      OR COALESCE(p.description, '') ILIKE '%' || v_query || '%'
      OR extensions.similarity(p.title, v_query) >= 0.2
    )
    AND (
      p_cursor_pickup_start_at IS NULL
      OR (p.pickup_start_at, p.id) > (p_cursor_pickup_start_at, p_cursor_pack_id)
    )
  ORDER BY p.pickup_start_at ASC, p.id ASC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public shop detail with safe profile, stats and hours.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_shop(p_shop_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'market_id', s.market_id,
    'locality_id', s.locality_id,
    'name', s.name,
    'description', s.description,
    'category', s.category,
    'phone', s.phone_e164,
    'website_url', s.website_url,
    'instagram_handle', s.instagram_handle,
    'address', NULLIF(concat_ws(', ', s.address_line1, s.address_line2), ''),
    'postal_code', s.postal_code,
    'latitude', s.latitude,
    'longitude', s.longitude,
    'timezone', s.timezone,
    'logo_path', s.logo_path,
    'cover_path', s.cover_path,
    'locality_name', l.name,
    'rating', CASE
      WHEN COALESCE(ss.rating_count, 0) = 0 THEN NULL
      ELSE round(ss.rating_sum::numeric / ss.rating_count::numeric, 2)
    END,
    'rating_count', COALESCE(ss.rating_count, 0),
    'hours', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'weekday', h.weekday,
        'sequence', h.sequence,
        'opens_at', h.opens_at,
        'closes_at', h.closes_at,
        'is_closed', h.is_closed
      ) ORDER BY h.weekday, h.sequence)
      FROM public.shop_hours h
      WHERE h.shop_id = s.id
    ), '[]'::jsonb)
  )
  FROM public.shops s
  JOIN public.markets m ON m.id = s.market_id AND m.status IN ('pilot', 'active')
  JOIN public.localities l ON l.id = s.locality_id AND l.market_id = s.market_id
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE s.id = p_shop_id AND s.status = 'verified' AND s.deleted_at IS NULL;
$$;

-- ---------------------------------------------------------------------------
-- Public reviews without user IDs or private moderation metadata.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_public_reviews(
  p_shop_id uuid,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_review_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  review_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 50
     OR (p_before_created_at IS NULL) <> (p_before_review_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REVIEW_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT r.id, r.rating, r.comment, r.created_at
  FROM public.reviews r
  JOIN public.shops s ON s.id = r.shop_id
  JOIN public.markets m ON m.id = s.market_id AND m.status IN ('pilot', 'active')
  WHERE r.shop_id = p_shop_id
    AND r.moderation_status = 'published'
    AND s.status = 'verified' AND s.deleted_at IS NULL
    AND (
      p_before_created_at IS NULL
      OR (r.created_at, r.id) < (p_before_created_at, p_before_review_id)
    )
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Published/effective legal metadata without internal author IDs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_current_legal_documents(
  p_market_id uuid,
  p_language text
)
RETURNS TABLE (
  legal_document_id uuid,
  document_type text,
  language text,
  version text,
  content_url text,
  content_sha256 text,
  effective_at timestamptz,
  is_required boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT d.id, d.document_type, d.language, d.version,
         d.content_url, d.content_sha256, d.effective_at, d.is_required
  FROM public.legal_documents d
  WHERE d.market_id = p_market_id
    AND d.language = p_language
    AND d.status = 'published'
    AND d.effective_at <= now()
  ORDER BY d.document_type;
$$;

-- ---------------------------------------------------------------------------
-- Safe authenticated reservation lists for customer and merchant dashboards.
-- ---------------------------------------------------------------------------
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
  created_at timestamptz
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
         r.cancel_reason, r.created_at
  FROM public.reservations r
  WHERE r.user_id = v_user_id
    AND (
      p_before_created_at IS NULL
      OR (r.created_at, r.id) < (p_before_created_at, p_before_reservation_id)
    )
  ORDER BY r.created_at DESC, r.id DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_shop_reservations(
  p_shop_id uuid,
  p_status text DEFAULT NULL,
  p_before_pickup_start_at timestamptz DEFAULT NULL,
  p_before_reservation_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  reservation_id uuid,
  pack_id uuid,
  pack_title text,
  customer_display_name text,
  status text,
  payment_status text,
  total_amount_minor bigint,
  currency_code text,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  timezone text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF NOT app_private.owns_shop(v_user_id, p_shop_id)
     AND NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_AUTHORIZED';
  END IF;

  IF p_limit NOT BETWEEN 1 AND 100
     OR (p_before_pickup_start_at IS NULL) <> (p_before_reservation_id IS NULL)
     OR (p_status IS NOT NULL AND p_status NOT IN (
       'payment_pending', 'confirmed', 'ready_pickup', 'picked_up',
       'completed', 'cancelled', 'no_show', 'expired'
     )) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SHOP_RESERVATION_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT r.id, r.pack_id, r.pack_title_snapshot,
         COALESCE(up.display_name, 'Usuario'),
         r.status, r.payment_status, r.total_amount_minor, r.currency_code,
         r.pickup_start_at, r.pickup_end_at, r.timezone_snapshot, r.created_at
  FROM public.reservations r
  LEFT JOIN public.user_profiles up ON up.id = r.user_id
  WHERE r.shop_id = p_shop_id
    AND (p_status IS NULL OR r.status = p_status)
    AND (
      p_before_pickup_start_at IS NULL
      OR (r.pickup_start_at, r.id) > (p_before_pickup_start_at, p_before_reservation_id)
    )
  ORDER BY r.pickup_start_at ASC, r.id ASC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- Owner dashboard snapshots. These avoid broad direct table SELECT grants.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_shop()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'shop', to_jsonb(s) - 'geog' - 'reviewed_by',
    'stats', to_jsonb(ss),
    'hours', COALESCE((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.weekday, h.sequence)
      FROM public.shop_hours h WHERE h.shop_id = s.id
    ), '[]'::jsonb)
  )
  FROM public.shops s
  JOIN public.user_profiles up ON up.id = auth.uid()
    AND up.account_status = 'active' AND up.deleted_at IS NULL
  LEFT JOIN public.shop_stats ss ON ss.shop_id = s.id
  WHERE s.owner_id = auth.uid() AND s.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.list_my_packs(
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_pack_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  pack_id uuid,
  title text,
  status text,
  price_minor bigint,
  currency_code text,
  total_stock integer,
  remaining_stock integer,
  pickup_start_at timestamptz,
  pickup_end_at timestamptz,
  image_path text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
BEGIN
  IF app_private.user_role(v_user_id) <> 'comercio'
     OR p_limit NOT BETWEEN 1 AND 100
     OR (p_before_created_at IS NULL) <> (p_before_pack_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MY_PACKS_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT p.id, p.title, p.status, p.price_minor, p.currency_code,
         p.total_stock, p.remaining_stock, p.pickup_start_at,
         p.pickup_end_at, p.image_path, p.created_at, p.updated_at
  FROM public.packs p
  JOIN public.shops s ON s.id = p.shop_id
  WHERE s.owner_id = v_user_id
    AND (
      p_before_created_at IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_pack_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT p_limit;
END;
$$;

-- Public catalogue functions.
GRANT EXECUTE ON FUNCTION public.search_available_packs(
  uuid, uuid, double precision, double precision, integer, text,
  timestamptz, uuid, integer
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_shop(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_reviews(uuid, timestamptz, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_current_legal_documents(uuid, text) TO anon, authenticated;

-- Authenticated dashboard functions.
GRANT EXECUTE ON FUNCTION public.list_my_reservations(timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_shop_reservations(uuid, text, timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_shop() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_packs(timestamptz, uuid, integer) TO authenticated;

COMMIT;
