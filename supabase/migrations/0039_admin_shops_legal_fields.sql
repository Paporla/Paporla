-- ============================================================================
-- PAPORLA — 0039_admin_shops_legal_fields.sql
-- El admin necesita VER tax_id y sanitary_resolution (0038) al revisar un
-- comercio: sin ellos en pantalla, el cotejo manual contra SII / SEREMI que
-- sustenta la verificación es imposible.
--
-- list_admin_shops pasa de 15 a 17 columnas de salida.
--
-- En Postgres, cambiar el RETURNS TABLE de una función exige DROP + CREATE
-- (no basta CREATE OR REPLACE: error 42P13 "cannot change return type").
-- El DROP se lleva el GRANT de 0027, así que se re-concede al final.
--
-- EJECUCIÓN: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- NUNCA en producción. Idempotente.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.list_admin_shops(text, text, timestamptz, uuid, integer);

CREATE FUNCTION public.list_admin_shops(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_shop_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  shop_id uuid,
  owner_id uuid,
  owner_name text,
  owner_email text,
  name text,
  description text,
  category text,
  status text,
  status_reason text,
  address_line1 text,
  phone_e164 text,
  logo_path text,
  tax_id text,
  sanitary_resolution text,
  reviewed_at timestamptz,
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
  IF NOT app_private.is_admin(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;

  IF p_limit NOT BETWEEN 1 AND 100
     OR (p_before_created_at IS NULL) <> (p_before_shop_id IS NULL)
     OR (p_status IS NOT NULL AND p_status NOT IN (
       'draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed'
     )) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ADMIN_SHOPS_PAGE_ARGUMENTS';
  END IF;

  RETURN QUERY
  SELECT s.id, s.owner_id,
         COALESCE(up.display_name, 'Usuario'),
         up.email,
         s.name, s.description, s.category,
         s.status, s.status_reason,
         s.address_line1, s.phone_e164, s.logo_path,
         s.tax_id, s.sanitary_resolution,
         s.reviewed_at, s.created_at, s.updated_at
  FROM public.shops s
  LEFT JOIN public.user_profiles up ON up.id = s.owner_id
  WHERE s.deleted_at IS NULL
    AND (p_status IS NULL OR s.status = p_status)
    AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%')
    AND (
      p_before_created_at IS NULL
      OR (s.created_at, s.id) < (p_before_created_at, p_before_shop_id)
    )
  ORDER BY s.created_at DESC, s.id DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.list_admin_shops(text, text, timestamptz, uuid, integer) IS
  'Listado admin de comercios (0027) + tax_id y sanitary_resolution (0039) para el cotejo manual de la verificacion. Solo admin.';

-- El DROP se llevó el GRANT de 0027; sin esta línea el panel admin recibe 42501.
GRANT EXECUTE ON FUNCTION public.list_admin_shops(text, text, timestamptz, uuid, integer) TO authenticated;

COMMIT;
