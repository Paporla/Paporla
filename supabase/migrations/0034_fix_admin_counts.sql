-- ============================================================================
-- PAPORLA — 0034_fix_admin_counts.sql
-- Fase 6.6 (hotfix: /admin y /admin/stats).
--
-- Corrige un bug de SQL de la funcion admin_counts (creada en 0027, Fase 6):
-- usaba `jsonb_object_agg(s.status, count(*))`, que es ILÉGAL en PostgreSQL
-- (ERROR: 42883 no — error 40709/aggregate: "aggregate function calls cannot
-- be nested"): un agregado (count(*)) no puede ir dentro del argumento de
-- otro agregado (jsonb_object_agg) en el mismo nivel de consulta. La funcion
-- fallaba SIEMPRE en runtime, por eso /admin nunca mostro los contadores
-- (skeleton para siempre, sin estado de error hasta la Fase 6.6) y
-- /admin/stats se quedaba en el mismo problema.
--
-- Detectado el 28-ago con la replica local completa paporla_full (migraciones
-- 0001-0033 + seed + llamada real como rol admin): admin_counts lanzaba el
-- error en la primera ejecucion; las demas 4 RPCs del panel (trend 0033,
-- list_admin_packs, list_admin_reservations, list_admin_shops) pasaron el
-- mismo smoke test sin error.
--
-- Correccion (lo minimo): by_status pasa por una subconsulta que agrupa
-- primero (status, count(*)) y luego jsonb_object_agg sobre la tabla interna.
--
-- CREATE OR REPLACE sobre la misma firma: conserva el GRANT existente (se
-- repite el GRANT por seguridad: es idempotente). Sin cambios de esquema.
--
-- Ejecutar en: SQL Editor de Supabase, proyecto STAGING (mqdauyvnrqnnzemdenfj).
-- ============================================================================

BEGIN;
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
          SELECT jsonb_object_agg(t.status, t.n)
          FROM (
            SELECT s.status, count(*) AS n
            FROM public.shops s
            WHERE s.deleted_at IS NULL
            GROUP BY s.status
          ) t
        ), '{}'::jsonb)
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.admin_counts() IS
  'Panel admin (0027, corregido en 0034, Fase 6.6): contadores del dashboard (usuarios, packs, reservas, shops total y por estado). Solo admin (is_admin). by_status via subconsulta: los agregados no se anidan en PostgreSQL.';
GRANT EXECUTE ON FUNCTION public.admin_counts() TO authenticated;

COMMIT;