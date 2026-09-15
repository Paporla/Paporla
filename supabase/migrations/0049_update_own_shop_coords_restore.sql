-- ============================================================================
-- PAPORLA — 0049_update_own_shop_coords_restore.sql
--
-- Restaura en update_own_shop la proteccion de coordenadas que dos
-- reescrituras sucesivas fueron perdiendo por el camino.
--
-- HISTORIA COMPLETA (leer antes de volver a tocar esta funcion):
--
--   0009  update_own_shop nace escribiendo latitude/longitude sin proteccion.
--   0021  Se arregla a proposito: COALESCE(p_latitude, shops.latitude), para
--         que enviar NULL significara "no lo toques".
--   0022  Se refuerza: la tabla shops tiene el CHECK shops_coordinates_pair_check
--         (0003) que exige las dos coordenadas o ninguna. Con COALESCE por
--         separado, enviar SOLO una producia una fila con latitud y sin
--         longitud -> violacion del CHECK -> error 23514 ininteligible. La 0022
--         pasa a tratar el par como unidad indivisible y anade los rangos, con
--         errores con nombre: COORDINATES_MUST_COME_IN_PAIR,
--         LATITUDE_OUT_OF_RANGE, LONGITUDE_OUT_OF_RANGE.
--   0024  Se reescribe la funcion entera para anadir p_default_pack_image_path
--         y SE PIERDEN los dos arreglos: vuelve a `latitude = p_latitude`.
--   0038  Se vuelve a reescribir para anadir p_tax_id y p_sanitary_resolution,
--         y el bug sigue ahi (lineas 208-209 de aquel archivo). Curiosamente el
--         tax_id SI usa el patron bueno (CASE WHEN p_tax_id IS NULL THEN tax_id);
--         solo las coordenadas se quedaron sin el.
--   0049  Esta migracion. Restaura la 0022 dentro del cuerpo de la 0038.
--
-- QUE ROMPE EN PRODUCCION MIENTRAS ESTE BUG VIVO:
--   Un comercio que guarda su perfil sin reenviar las dos coordenadas se borra
--   su propia ubicacion. El mapa lo deja sin punto y el comercio y sus packs
--   desaparecen del catalogo publico. Es perder clientes por rellenar un
--   formulario, y ademas es silencioso: la funcion devuelve success=true.
--
-- QUE CAMBIA EXACTAMENTE (nada mas):
--   1. Tres guardas al principio del cuerpo, ANTES de tocar la tabla:
--      pareja, rango de latitud y rango de longitud.
--   2. Dos variables v_lat/v_lng y el IF que conserva las guardadas cuando no
--      llega ninguna coordenada nueva.
--   3. El UPDATE pasa de `latitude = p_latitude` a `latitude = v_lat`.
--   4. Un COMMENT ON FUNCTION, que la 0038 nunca puso y cuya ausencia es parte
--      de por que esto se perdio dos veces.
--
-- La firma de 18 parametros es IDENTICA a la de 0038 (incluidos los DEFAULT
-- NULL de p_default_pack_image_path, p_tax_id y p_sanitary_resolution). Es
-- importante: si cambiara la lista de parametros, CREATE OR REPLACE crearia una
-- segunda funcion conviviente en vez de sustituir la existente (mismo motivo
-- por el que la 0042 tuvo que borrar antes la version antigua).
--
-- CREATE OR REPLACE conserva los GRANT. Los permisos de esta funcion los
-- gestionan 0012 (GRANT a authenticated) y 0041 (REVOKE de PUBLIC y de anon),
-- y siguen intactos. No se reemiten aqui a proposito.
--
-- Idempotente: se puede reaplicar sin efecto secundario.
-- ============================================================================

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
  p_cover_path text,
  -- Convencion distinta al resto de campos, a proposito:
  --   NULL (o ausente) -> no tocar el valor guardado
  --   ''               -> borrar la foto por defecto
  -- Motivo: mientras se despliega, el frontend anterior sigue llamando con 15
  -- argumentos. Con un DEFAULT NULL que sobrescribe, esas llamadas borrarian
  -- la foto sin querer. Verificado en pruebas antes de adoptar esta forma.
  p_default_pack_image_path text DEFAULT NULL,
  -- Misma convencion que p_default_pack_image_path (NULL = no tocar,
  -- '' = borrar) y por el mismo motivo: el frontend anterior llama con 16
  -- argumentos y no debe pisar lo guardado.
  p_tax_id text DEFAULT NULL,
  p_sanitary_resolution text DEFAULT NULL
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
  -- ---------------------------------------------------------------------
  -- BLOQUE RESTAURADO DE 0022. NO QUITAR.
  -- Ya se perdio dos veces al reescribir esta funcion (0024 y 0038).
  -- Si vas a anadir un parametro nuevo, anadelo al final con DEFAULT NULL
  -- y NO reescribas el cuerpo: copia esta funcion entera y modifica solo
  -- la linea del UPDATE que necesites. Hay tests pgTAP que vigilan estas
  -- tres guardas (supabase/tests/0016_security_tests.sql).
  --
  -- Las coordenadas van en pareja: o las dos, o ninguna. Una sola violaria
  -- shops_coordinates_pair_check (0003) con un error 23514 ininteligible.
  -- ---------------------------------------------------------------------
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
  -- las que ya estaban. El par nunca se rompe y la ubicacion nunca se borra
  -- por guardar un formulario.
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

  -- Un RUT invalido se rechaza con error explicito. Sin este IF, el CASE de
  -- abajo lo convertiria en NULL en silencio y el comercio creeria que guardo.
  IF p_tax_id IS NOT NULL AND btrim(p_tax_id) <> ''
     AND app_private.normalize_chile_rut(p_tax_id) IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TAX_ID';
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
    default_pack_image_path = CASE
      WHEN p_default_pack_image_path IS NULL THEN default_pack_image_path
      ELSE NULLIF(btrim(p_default_pack_image_path), '')
    END,
    tax_id = CASE
      WHEN p_tax_id IS NULL THEN tax_id
      ELSE NULLIF(app_private.normalize_chile_rut(p_tax_id), '')
    END,
    sanitary_resolution = CASE
      WHEN p_sanitary_resolution IS NULL THEN sanitary_resolution
      ELSE NULLIF(btrim(p_sanitary_resolution), '')
    END,
    updated_at = now()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id);
END;
$$;

COMMENT ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text, text, text
) IS
  'Actualiza el perfil del comercio propio. Convenciones de NULL por campo: '
  'las coordenadas (latitude/longitude) son un par indivisible — ambas '
  'actualizan, ninguna conserva las guardadas, una sola lanza '
  'COORDINATES_MUST_COME_IN_PAIR (ver 0021, 0022 y 0049; el bloque se perdio '
  'en 0024 y 0038). default_pack_image_path, tax_id y sanitary_resolution '
  'usan NULL = no tocar y cadena vacia = borrar. El resto de campos de texto '
  'se reescriben siempre y la cadena vacia los deja en NULL.';