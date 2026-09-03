-- ============================================================================
-- PAPORLA — 0042_create_own_shop_coords.sql
--
-- create_own_shop nunca aceptó coordenadas: las definiciones de 0009 y 0018
-- tienen 9 parámetros y ninguno es geográfico. La página de perfil del comercio
-- (y su test vitest) se escribieron creyendo lo contrario y llaman a la RPC con
-- p_latitude/p_longitude, por lo que PostgREST responde
-- "Could not find the function public.create_own_shop(...) in the schema cache"
-- y el alta del comercio queda imposible. Bug real detectado en el ensayo local
-- del 2026-09-03; la BD reconstruida desde migraciones es la fuente de verdad.
--
-- Esta migración alinea la base con el frontend:
--   1. Elimina la versión de 9 parámetros (CREATE OR REPLACE no puede cambiar
--      la lista de parámetros: crearía una segunda función conviviente).
--   2. La recrea con p_latitude/p_longitude opcionales (double precision),
--      con la misma validación que update_own_shop (0022): pareja y rango.
--   3. El INSERT guarda las coordenadas en shops.latitude/longitude,
--      respetando el CHECK de pareja de 0003.
--
-- El resto del cuerpo es idéntico a 0018 (rol, duplicado, localidad/mercado).
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_own_shop(
  p_market_id uuid,
  p_locality_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_phone_e164 text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'app_private', 'public'
AS $function$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_role text := app_private.user_role(v_user_id);
  v_timezone text;
  v_shop_id uuid;
BEGIN
  -- Las coordenadas van en pareja: o las dos, o ninguna (misma regla que
  -- update_own_shop, 0022).
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

  IF v_role <> 'comercio' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'MERCHANT_ROLE_REQUIRED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.shops s WHERE s.owner_id = v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'SHOP_ALREADY_EXISTS';
  END IF;

  SELECT l.timezone INTO v_timezone
  FROM public.localities l
  JOIN public.markets m ON m.id = l.market_id
  WHERE l.id = p_locality_id
    AND l.market_id = p_market_id
    AND l.is_active = true
    AND m.status IN ('pilot', 'active');

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'LOCALITY_MARKET_NOT_ACTIVE';
  END IF;

  INSERT INTO public.shops (
    owner_id, market_id, locality_id, name, description, category,
    phone_e164, address_line1, address_line2, postal_code,
    latitude, longitude, timezone, status
  )
  VALUES (
    v_user_id, p_market_id, p_locality_id, btrim(p_name),
    NULLIF(btrim(p_description), ''), NULLIF(btrim(p_category), ''),
    NULLIF(btrim(p_phone_e164), ''), NULLIF(btrim(p_address_line1), ''),
    NULLIF(btrim(p_address_line2), ''), NULLIF(btrim(p_postal_code), ''),
    p_latitude, p_longitude, v_timezone, 'draft'
  )
  RETURNING id INTO v_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', v_shop_id, 'status', 'draft');
END;
$function$;

COMMENT ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text, double precision, double precision) IS
  'Crea el comercio del usuario autenticado (rol comercio) en estado draft. 0042: acepta coordenadas opcionales en pareja.';

REVOKE ALL ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text, double precision, double precision) TO authenticated;