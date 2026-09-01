-- ============================================================================
-- PAPORLA — 0038_shop_tax_id_sanitary.sql
-- Verificación de comercios con respaldo legal (Bloque D):
--   1. shops.tax_id               — RUT de la empresa (o del titular), formato
--                                   normalizado NNNNNNNN-D, dígito verificador
--                                   validado con módulo 11 EN LA BASE.
--   2. shops.sanitary_resolution  — Nº de resolución sanitaria de la SEREMI de
--                                   Salud (D.S. 977/96: obligatoria para todo
--                                   establecimiento que expende alimentos).
--   3. update_own_shop 16 → 18 parámetros (convención NULL = no tocar).
--   4. submit_own_shop_for_review exige ambos campos para enviar a revisión.
--
-- El admin los verá en get_my_shop/list_admin_shops y los cotejará a mano
-- durante el piloto (SII / SEREMI en Línea). La copia de los documentos PDF
-- vendrá en una fase posterior (bucket privado); el número declarado +
-- cotejo manual basta para el piloto y ya deja rastro auditable.
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción. Idempotente.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Normalizador + validador de RUT chileno (módulo 11).
--    En app_private: es una utilidad interna, no una RPC de cliente.
--    Acepta '12.345.678-5', '12345678-5' o '123456785'; devuelve
--    '12345678-5' (sin puntos, guion, K mayúscula) o NULL si el formato o el
--    dígito verificador no cuadran. El frontend valida lo mismo para avisar
--    al escribir, pero la base es quien tiene la última palabra.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.normalize_chile_rut(p_rut text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $fn$
DECLARE
  v_clean text;
  v_body text;
  v_dv text;
  v_sum integer := 0;
  v_factor integer := 2;
  v_expected text;
  i integer;
BEGIN
  IF p_rut IS NULL OR btrim(p_rut) = '' THEN
    RETURN NULL;
  END IF;

  v_clean := upper(regexp_replace(p_rut, '[.\s-]', '', 'g'));

  IF v_clean !~ '^[0-9]{7,8}[0-9K]$' THEN
    RETURN NULL;
  END IF;

  v_body := left(v_clean, length(v_clean) - 1);
  v_dv := right(v_clean, 1);

  FOR i IN REVERSE length(v_body)..1 LOOP
    v_sum := v_sum + (substr(v_body, i, 1))::integer * v_factor;
    v_factor := CASE WHEN v_factor = 7 THEN 2 ELSE v_factor + 1 END;
  END LOOP;

  v_expected := CASE 11 - (v_sum % 11)
    WHEN 11 THEN '0'
    WHEN 10 THEN 'K'
    ELSE (11 - (v_sum % 11))::text
  END;

  IF v_dv <> v_expected THEN
    RETURN NULL;
  END IF;

  RETURN v_body || '-' || v_dv;
END;
$fn$;

COMMENT ON FUNCTION app_private.normalize_chile_rut(text) IS
  'Normaliza un RUT chileno a NNNNNNNN-D validando el digito verificador (modulo 11). NULL si es invalido.';

-- ---------------------------------------------------------------------------
-- 1. Columnas
-- ---------------------------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS sanitary_resolution text;

COMMENT ON COLUMN public.shops.tax_id IS
  'RUT de la empresa o del titular, normalizado NNNNNNNN-D con DV validado. Exigido para enviar a revision (0038).';
COMMENT ON COLUMN public.shops.sanitary_resolution IS
  'Numero de resolucion sanitaria SEREMI de Salud (D.S. 977/96). Texto libre, cotejo manual del admin. Exigido para enviar a revision (0038).';

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shops'::regclass
      AND conname = 'shops_tax_id_check'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_tax_id_check CHECK (
        tax_id IS NULL OR tax_id ~ '^[0-9]{7,8}-[0-9K]$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shops'::regclass
      AND conname = 'shops_sanitary_resolution_check'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_sanitary_resolution_check CHECK (
        sanitary_resolution IS NULL
        OR length(btrim(sanitary_resolution)) BETWEEN 3 AND 120
      );
  END IF;
END;
$do$;

-- ---------------------------------------------------------------------------
-- 2. update_own_shop: 16 -> 18 parametros.
--    Igual que en 0024: en Postgres una firma nueva NO reemplaza a la vieja
--    (sobrecarga), hay que soltar la de 16 argumentos y re-conceder el GRANT.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text
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
    latitude = p_latitude,
    longitude = p_longitude,
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

GRANT EXECUTE ON FUNCTION public.update_own_shop(
  uuid, uuid, text, text, text, text, text, text, text, text, text,
  double precision, double precision, text, text, text, text, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_own_shop_for_review: los dos campos nuevos son obligatorios.
--    Error especifico por campo (no el SHOP_PROFILE_INCOMPLETE generico):
--    el aviso del perfil ya guia al comercio, pero si llega a la RPC por otra
--    via debe saber exactamente que falta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_own_shop_for_review(p_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, app_private, public
AS $$
DECLARE
  v_user_id uuid := app_private.require_active_caller();
  v_shop public.shops%ROWTYPE;
BEGIN
  SELECT * INTO v_shop FROM public.shops
  WHERE id = p_shop_id AND owner_id = v_user_id FOR UPDATE;

  IF NOT FOUND OR v_shop.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_NOT_SUBMITTABLE';
  END IF;

  IF v_shop.locality_id IS NULL OR v_shop.name IS NULL
     OR v_shop.category IS NULL OR v_shop.phone_e164 IS NULL
     OR v_shop.address_line1 IS NULL OR v_shop.latitude IS NULL
     OR v_shop.longitude IS NULL OR v_shop.logo_path IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_PROFILE_INCOMPLETE';
  END IF;

  IF v_shop.tax_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_TAX_ID_REQUIRED';
  END IF;

  IF v_shop.sanitary_resolution IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'SHOP_SANITARY_RESOLUTION_REQUIRED';
  END IF;

  UPDATE public.shops
  SET status = 'pending_review', status_reason = NULL,
      reviewed_by = NULL, reviewed_at = NULL, updated_at = now()
  WHERE id = p_shop_id;

  PERFORM app_private.enqueue_event(
    'shop.submitted_for_review', 'shop', p_shop_id, v_shop.market_id,
    'shop:' || p_shop_id || ':review_submission:' || txid_current()::text,
    jsonb_build_object('shop_id', p_shop_id), now()
  );

  RETURN jsonb_build_object('success', true, 'shop_id', p_shop_id, 'status', 'pending_review');
END;
$$;

COMMIT;

-- get_my_shop usa to_jsonb(s): expone tax_id y sanitary_resolution sin cambios.
-- list_admin_shops se amplia en el paso de frontend del admin (siguiente lote)
-- para no mezclar dos superficies en una migracion.
