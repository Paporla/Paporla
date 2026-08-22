-- 0022_update_own_shop_coords_pair.sql
--
-- Corrige un caso que introdujo la 0021.
--
-- La 0021 aplicó COALESCE por separado a latitude y longitude, para que un NULL
-- significara "no lo toques". Pero la tabla shops tiene esta restricción (0003):
--
--   CONSTRAINT shops_coordinates_pair_check CHECK (
--     (latitude IS NULL AND longitude IS NULL)
--     OR (latitude IS NOT NULL AND longitude IS NOT NULL))
--
-- Es decir: las dos coordenadas o ninguna. Con COALESCE independiente, si el
-- cliente enviaba SOLO una (por ejemplo, latitud válida y longitud escrita con
-- coma decimal, que el front convierte en NULL), el resultado era una fila con
-- latitud pero sin longitud -> se violaba el CHECK -> error 23514 -> HTTP 400,
-- con un mensaje que no le dice nada a nadie.
--
-- Arreglo: tratar el par como una unidad indivisible.
--   - Llegan las DOS  -> se actualizan las dos.
--   - No llega NINGUNA -> se conservan las que hubiera (intención de la 0021).
--   - Llega SOLO UNA  -> error explícito COORDINATES_MUST_COME_IN_PAIR, antes
--                        de tocar la tabla. Fallo del cliente, mensaje legible.
--
-- Se valida además el rango, para dar un error con nombre en vez de dejar que
-- salte shops_latitude_check / shops_longitude_check.
--
-- Firma idéntica a la de 0009/0021. CREATE OR REPLACE conserva los GRANT de 0012.

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
  v_lat double precision;
  v_lng double precision;
BEGIN
  -- Las coordenadas van en pareja: o las dos, o ninguna.
  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'COORDINATES_MUST_COME_IN_PAIR',
      HINT    = 'Envia latitud y longitud juntas, o ninguna de las dos.';
  END IF;

  IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LATITUDE_OUT_OF_RANGE';
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LONGITUDE_OUT_OF_RANGE';
  END IF;

  SELECT s.market_id, s.latitude, s.longitude
    INTO v_market_id, v_lat, v_lng
  FROM public.shops s
  WHERE s.id = p_shop_id AND s.owner_id = v_user_id
    AND s.status NOT IN ('suspended', 'closed') AND s.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHOP_NOT_OWNED_OR_INACTIVE';
  END IF;

  -- Si llegan las dos, mandan las nuevas. Si no llega ninguna, se conservan
  -- las que ya estaban. El par nunca se rompe.
  IF p_latitude IS NOT NULL THEN
    v_lat := p_latitude;
    v_lng := p_longitude;
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
    latitude = v_lat,
    longitude = v_lng,
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
  'Actualiza el perfil del comercio propio. Las coordenadas se tratan como un '
  'par indivisible: ambas actualizan, ninguna conserva las previas, una sola '
  'lanza COORDINATES_MUST_COME_IN_PAIR. Ver 0021 y 0022.';
