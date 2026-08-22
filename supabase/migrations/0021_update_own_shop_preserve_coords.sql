-- 0021_update_own_shop_preserve_coords.sql
--
-- Problema:
--   update_own_shop escribía latitude/longitude de forma incondicional. Si un
--   cliente enviaba p_latitude/p_longitude en NULL (por ejemplo, porque la
--   pestaña Ubicación estaba vacía en el formulario), las coordenadas del
--   comercio se borraban. El trigger shops_sync_geog (0010) ponía entonces
--   geog := NULL, y el comercio y sus packs desaparecían del catálogo, porque
--   search_available_packs y la búsqueda de comercios exigen geog IS NOT NULL.
--
-- Arreglo:
--   COALESCE(p_latitude, latitude) y COALESCE(p_longitude, longitude). Un NULL
--   pasa a significar "no lo toques" en lugar de "bórralo". Ningún cliente
--   -web, móvil o futuro- puede dejar un comercio sin ubicación por descuido.
--
-- Nota:
--   Las coordenadas son obligatorias para poder verificar un comercio
--   (submit_own_shop_for_review las exige NOT NULL), así que no existe un caso
--   legítimo de "quiero dejar este comercio sin coordenadas".
--
-- Firma idéntica a la de 0009. CREATE OR REPLACE conserva los GRANT ya
-- otorgados en 0012, así que no hace falta volver a concederlos.

CREATE OR REPLACE FUNCTION public.update_own_shop(
  p_shop_id uuid,
  p_locality_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_phone_e164 text,
  p_website_url text,
  p_instagram_handle text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text,
  p_latitude double precision,
  p_longitude double precision,
  p_logo_path text,
  p_cover_path text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_market_id uuid;
  v_timezone text;
BEGIN
  SELECT s.market_id INTO v_market_id
  FROM public.shops s
  WHERE s.id = p_shop_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed') AND s.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_OWNED_OR_INACTIVE';
  END IF;

  SELECT l.timezone INTO v_timezone
  FROM public.localities l
  WHERE l.id = p_locality_id AND l.market_id = v_market_id AND l.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_MISMATCH';
  END IF;

  UPDATE public.shops
  SET
    locality_id = p_locality_id,
    name = btrim(p_name),
    description = NULLIF(btrim(p_description), ''),
    category = NULLIF(btrim(p_category), ''),
    phone_e164 = NULLIF(btrim(p_phone_e164), ''),
    website_url = NULLIF(btrim(p_website_url), ''),
    instagram_handle = NULLIF(btrim(p_instagram_handle), ''),
    address_line1 = NULLIF(btrim(p_address_line1), ''),
    address_line2 = NULLIF(btrim(p_address_line2), ''),
    postal_code = NULLIF(btrim(p_postal_code), ''),
    latitude = COALESCE(p_latitude, shops.latitude),
    longitude = COALESCE(p_longitude, shops.longitude),
    timezone = v_timezone,
    logo_path = NULLIF(btrim(p_logo_path), ''),
    cover_path = NULLIF(btrim(p_cover_path), ''),
    updated_at = now()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id);
END;
$$;

COMMENT ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text
) IS
  'Actualiza el perfil del comercio propio. latitude/longitude se conservan '
  'si llegan en NULL (COALESCE): un NULL significa "no lo toques", nunca '
  '"bórralo". Ver 0021.';
