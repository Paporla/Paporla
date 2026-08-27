-- ============================================================================
-- PAPORLA — 0027_admin_shops_rpc.sql
-- Fase 6 (panel admin), H2 + H3.
--
--   1. admin_counts()     — contadores globales con comercios POR ESTADO.
--                           El dashboard admin leía `verified`/`banned` (columnas
--                           que no existen en shops, 0003) y mostraba ceros.
--   2. list_admin_shops() — listado canónico de comercios con filtro por estado,
--                           búsqueda por nombre y paginación keyset
--                           (created_at DESC, id DESC), mismo patrón que
--                           list_shop_reservations (0014:333).
--
-- Ambas funciones: SECURITY DEFINER + is_admin (solo admin), STABLE, y el
-- cliente las usa vía GRANT EXECUTE TO authenticated (la función valida el
-- rol). SIN cambios de esquema: tablas existentes.
--
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- H2 — Contadores del panel admin (reemplaza los .select('verified, banned')
-- rotos de useAdminCounts).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_counts()
RETURNS jsonb
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

  RETURN (
    SELECT jsonb_build_object(
      'users',        (SELECT count(*) FROM public.user_profiles),
      'packs',        (SELECT count(*) FROM public.packs),
      'reservations', (SELECT count(*) FROM public.reservations),
      'shops', jsonb_build_object(
        'total', (
          SELECT count(*) FROM public.shops s WHERE s.deleted_at IS NULL
        ),
        'by_status', COALESCE((
          SELECT jsonb_object_agg(s.status, count(*))
          FROM public.shops s
          WHERE s.deleted_at IS NULL
          GROUP BY s.status
        ), '{}'::jsonb)
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_counts() IS
  'Contadores del panel admin (H2, Fase 6). Solo admin: requiere is_admin.';

GRANT EXECUTE ON FUNCTION public.admin_counts() TO authenticated;

-- ---------------------------------------------------------------------------
-- H3 — Listado de comercios para moderación (Fase 6). Devuelve las columnas
-- canónicas de shops (0003) + datos del dueño. Keyset (created_at DESC, id
-- DESC) igual que list_shop_reservations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_admin_shops(
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
  'Listado admin de comercios con filtro por estado, búsqueda y keyset (H3, Fase 6). Solo admin.';

GRANT EXECUTE ON FUNCTION public.list_admin_shops(text, text, timestamptz, uuid, integer) TO authenticated;

COMMIT;
