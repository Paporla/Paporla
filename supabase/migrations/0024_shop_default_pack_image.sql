-- 0024_shop_default_pack_image.sql
--
-- Objetivo
--   Que el comercio configure UNA sola vez la foto que usaran sus packs y no
--   tenga que subir una imagen cada vez que publica.
--
-- Por que una columna nueva y no reutilizar cover_path
--   cover_path es la portada del local (fachada, salon). Sirve para la ficha
--   publica del comercio, pero como foto de producto rinde mal. Separamos los
--   dos conceptos para que cada uno pueda evolucionar sin pisar al otro.
--
-- Contenido
--   1. shops.default_pack_image_path  (ruta del bucket, nunca URL absoluta)
--   2. update_own_shop pasa de 15 a 16 parametros
--
-- Nota importante sobre el punto 2
--   En Postgres las funciones se sobrecargan por firma. Un CREATE OR REPLACE
--   con un parametro extra NO sustituye a la anterior: crea una segunda version
--   y las llamadas quedan ambiguas (error 42725). Por eso hay que soltar la
--   firma vieja de forma explicita. Y como el GRANT EXECUTE de 0012 apunta a la
--   firma de 15 argumentos, se pierde al borrarla: hay que volver a concederlo
--   sobre la firma nueva o el cliente recibira 42501.
--
-- Idempotente: se puede ejecutar mas de una vez sin romper nada.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Columna
-- ---------------------------------------------------------------------------

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS default_pack_image_path text;

COMMENT ON COLUMN public.shops.default_pack_image_path IS
  'Ruta en el bucket shop-images de la foto por defecto de los packs. '
  'Se configura una vez desde el perfil del comercio y la heredan los packs '
  'que no suben una foto propia. Nunca una URL absoluta.';

-- Mismo criterio que shops_logo_path_check y shops_cover_path_check (0003):
-- guardamos rutas relativas, jamas URLs. ADD CONSTRAINT no admite IF NOT
-- EXISTS, asi que consultamos el catalogo antes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shops'::regclass
      AND conname = 'shops_default_pack_image_path_check'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_default_pack_image_path_check CHECK (
        default_pack_image_path IS NULL
        OR default_pack_image_path !~ '^(?:https?:)?//'
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. update_own_shop: 15 -> 16 parametros
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text
);

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
  p_default_pack_image_path text DEFAULT NULL
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
    latitude = p_latitude,
    longitude = p_longitude,
    timezone = v_timezone,
    logo_path = NULLIF(btrim(p_logo_path), ''),
    cover_path = NULLIF(btrim(p_cover_path), ''),
    default_pack_image_path = CASE
      WHEN p_default_pack_image_path IS NULL THEN default_pack_image_path
      ELSE NULLIF(btrim(p_default_pack_image_path), '')
    END,
    updated_at = now()
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id);
END;
$$;

-- El DROP anterior se llevo por delante el GRANT de 0012. Sin esta linea el
-- comercio recibe 42501 al guardar el perfil.
GRANT EXECUTE ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text
) TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- get_my_shop no necesita cambios: usa to_jsonb(s), asi que expone la columna
-- nueva de forma automatica.
-- ---------------------------------------------------------------------------
