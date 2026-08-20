CREATE OR REPLACE FUNCTION public.create_own_shop(
  p_market_id uuid,
  p_locality_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_phone_e164 text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text
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
    timezone, status
  )
  VALUES (
    v_user_id, p_market_id, p_locality_id, btrim(p_name),
    NULLIF(btrim(p_description), ''), NULLIF(btrim(p_category), ''),
    NULLIF(btrim(p_phone_e164), ''), NULLIF(btrim(p_address_line1), ''),
    NULLIF(btrim(p_address_line2), ''), NULLIF(btrim(p_postal_code), ''),
    v_timezone, 'draft'
  )
  RETURNING id INTO v_shop_id;

  RETURN jsonb_build_object('success', true, 'shop_id', v_shop_id, 'status', 'draft');
END;
$function$;

REVOKE ALL ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_own_shop(uuid, uuid, text, text, text, text, text, text, text) TO authenticated;